#include "Adafruit_TinyUSB.h"
#include <bluefruit.h>
#include <Adafruit_ADS1X15.h>
#include <math.h>
#include <Wire.h>
#include <Adafruit_ICM20X.h>
#include <Adafruit_ICM20948.h>
#include <Adafruit_ADXL375.h>
#include <Adafruit_Sensor.h>

#define DEBUG 1

////////////////////////////////////////
// Constant Definitions


// I2C Addresses
#define ADS1X15_ADDR 0x48
#define ICM20948_ADDR 0x69

// SPI Pins
#define ADXL375_SCK 13
#define ADXL375_MISO 12
#define ADXL375_MOSI 11
#define ADXL375_CS 10

// nRF52840 Ports
#define LED_STATUS P0 .08
#define nPM1300_INT P1 .00
#define MAX30102_INT P0 .02
#define FLASH_CS P0 .09
#define IMU1_CS P0 .06
#define IMU1_INT P0 .05
#define IMU2_CS P0 .10
#define IMU2_INT P1 .02
#define ADC1_INT P0 .16
#define ADC2_INT P1 .07
#define ACC1_CS P0 .14
#define ACC1_INT1 P0 .30
#define ACC2_CS P1 .12
#define ACC2_INT1 P1 .10

// ADC Pins
#define THM_PIN 0
#define FSR_L_PIN 1
#define FSR_R_PIN 2
#define VREF 3.3   // ADC voltage reference
#define RF 100000  // Feedback resistor (100k)

// GATT UUIDs for Custom Services
#define UUID128_SVC_HRM "a329162e-bf3d-4f73-9a1a-bb8ccfe142e7"
#define UUID128_CHR_HRMC "0a21fc6f-6edb-4086-9460-0eccb35150fb"

#define UUID128_SVC_HTM "d2a95330-d754-4a5b-bb74-b1b09bef98f5"
#define UUID128_CHR_HTMC "6896072b-24ce-4982-ac6a-899fa7183069"

#define UUID128_SVC_IMU "5f07ce79-170a-4c45-b8ca-eae29004e45f"
#define UUID128_CHR_IMUC "d2e9a9c2-a94b-42cb-b11d-b76549e7a164"

#define UUID128_SVC_FSR "56f38df0-e65b-4190-a3da-9f941c9d1763"
#define UUID128_CHR_BITE_FORCE "f86a2066-5203-4bed-b090-ac0b89e68d81"


////////////////////////////////////////
/// Bluetooth Setup
void start_adv(void);
void setup_HRM(void);
void setup_HTM(void);
void setup_IMU(void);
void setup_FSR(void);

void connect_callback(uint16_t conn_handle);
void disconnect_callback(uint16_t conn_handle, uint8_t reason);
void cccd_callback(uint16_t conn_hdl, BLECharacteristic *chr, uint16_t cccd_value);

// Heart Rate Monitor Service
BLEService hrms = BLEService(UUID128_SVC_HRM);
BLECharacteristic hrmc = BLECharacteristic(UUID128_CHR_HRMC);

// Health Thermometer Service
BLEService htms = BLEService(UUID128_SVC_HTM);
BLECharacteristic htmc = BLECharacteristic(UUID128_CHR_HTMC);

// Motion Service
BLEService motion = BLEService(UUID128_SVC_IMU);
BLECharacteristic motionc = BLECharacteristic(UUID128_CHR_IMUC);

// FSR Service
BLEService fsr = BLEService(UUID128_SVC_FSR);
BLECharacteristic bite_forcec = BLECharacteristic(UUID128_CHR_BITE_FORCE);

// Standard Services
BLEDis bledis;
BLEBas blebas;


////////////////////////////////////////
/// Peripheral Setup

/// ADC Setup
bool adc_init();
float get_force();
float get_temperature_C();
float get_temperature_F();
float voltageToTemperature(float voltage);

// Thermistor Constants
const float BETA = 3969;                /* beta coefficient from datasheet */
const float THERMISTOR_NOMINAL = 10000; /* resistance at 25 degrees C */
const float TEMPERATURE_NOMINAL = 25;   /* temperature for nominal resistance  in C */
const float SERIES_RESISTOR = 10000;    /* value of the pull-down resistor in the divider */

/// IMU Setup
void imu_init();
uint16_t measurement_delay_us = 65535;  // Delay between measurements for testing

/// Peripheral Objects
Adafruit_ADS1015 ads;
Adafruit_ICM20948 icm;
Adafruit_ADXL375 accel = Adafruit_ADXL375(ADXL375_SCK, ADXL375_MISO, ADXL375_MOSI, ADXL375_CS, 12345);
bool adsReady = false;
bool icmReady = false;
bool adxlReady = false;


// Global variables

// Health Thermometer Data
struct __attribute__((packed)) htm_packet {
  int16_t temperature;  // 2 bytes
  uint32_t timestamp;   // 4 bytes
};

// Force Sensitive Resistor Data
struct __attribute__((packed)) fsr_packet {
  int16_t left_bite;   // 2 bytes
  int16_t right_bite;  // 2 bytes
  uint32_t timestamp;  // 4 bytes
};

struct __attribute__((packed)) hrm_packet {
  uint8_t heart_rate;  // 1 byte
  uint32_t timestamp;  // 4 bytes
};

struct __attribute__((packed)) motion_packet {
  int16_t gyro[3];      // 6 bytes
  int16_t accel16[3];   // 6 bytes
  int16_t accel200[3];  // 6 bytes
  int16_t mag[3];       // 6 bytes
  uint16_t bite_l;      // 2 bytes
  uint16_t bite_r;      // 2 bytes
  uint32_t timestamp;   // 4 bytes
};

hrm_packet heart_data;
htm_packet temperature_data;
motion_packet motion_data;
fsr_packet biteforce_data;

uint32_t boot_time;


////////////////////////////////////////
/// Main
// COM6 is the J-Link port (Serial2). The nRF USB port is Serial.
// Print to both so the monitor shows text on the cable that already connects.
void boardLog(const char *msg) {
  Serial.println(msg);
  Serial2.println(msg);
}

void setup() {
  Serial2.begin(115200);
  Serial2.println("Boot");

  Serial.begin(115200);
  // Do not wait forever for a serial monitor. That made the board look dead.
  unsigned long serialDeadline = millis() + 2000;
  while (!Serial && (long)(serialDeadline - millis()) > 0) delay(10);
  boardLog("Initializing...");

  pinMode(PIN_LED2, OUTPUT);

  Bluefruit.begin();
  Bluefruit.setName("Smart Mouthguard");

  Bluefruit.Periph.setConnectCallback(connect_callback);
  Bluefruit.Periph.setDisconnectCallback(disconnect_callback);

  // Board Metadata
  bledis.setManufacturer("PHYSIOCHECK");
  bledis.setModel("SMG v0.1");
  bledis.begin();

  // Battery Service
  blebas.begin();
  blebas.write(100);

  // Setup Services
  setup_HRM();
  setup_HTM();
  setup_IMU();
  setup_FSR();

  // Send Initial Data Packet
  memset(&heart_data, 0, sizeof(heart_data));
  hrmc.write((uint8_t *)&heart_data, sizeof(heart_data));

  memset(&temperature_data, 0, sizeof(temperature_data));
  hrmc.write((uint8_t *)&temperature_data, sizeof(temperature_data));

  memset(&motion_data, 0, sizeof(motion_data));
  motionc.write((uint8_t *)&motion_data, sizeof(motion_data));

  memset(&biteforce_data, 0, sizeof(biteforce_data));
  bite_forcec.write((uint8_t *)&biteforce_data, sizeof(biteforce_data));

  start_adv();

  // Missing sensors must not freeze the board. Heart notifications still go out.
  adsReady = adc_init();
  imu_init();

  // Save Start Time
  boot_time = millis();

  boardLog("Setup complete. Advertising...");
}


void loop() {

  digitalWrite(PIN_LED2, LOW);
  delay(500);

  if (Bluefruit.connected()) {
    // Battery Life
    blebas.write(100);

    heart_data.heart_rate = 70;  // stand-in until a heart sensor is attached
    heart_data.timestamp = millis();
    hrmc.notify((uint8_t *)&heart_data, sizeof(heart_data));

    if (adsReady) {
      temperature_data.temperature = (int16_t)(get_temperature_C() * 100);
      temperature_data.timestamp = millis();
      Serial.print("Temperature: ");
      Serial.print(temperature_data.temperature);
      Serial.print("\t\t Time: ");
      Serial.println(temperature_data.timestamp);
      htmc.indicate((uint8_t *)&temperature_data, sizeof(temperature_data));

      biteforce_data.left_bite = (int16_t)(get_force() * 100);
      biteforce_data.timestamp = millis();
      Serial.print("Force: ");
      Serial.print(biteforce_data.left_bite);
      Serial.print("\t\t Time: ");
      Serial.println(biteforce_data.timestamp);
      bite_forcec.notify((uint8_t *)&biteforce_data, sizeof(biteforce_data));
    }

    if (icmReady || adxlReady) {
      update_motion_data();
      motion_data.timestamp = millis();
      motionc.notify((uint8_t *)&motion_data, sizeof(motion_data));
    }
  }

  digitalWrite(PIN_LED2, HIGH);
  delay(500);
}

// Service Setup Functions
void setup_HRM(void) {
  hrms.begin();
  hrmc.setProperties(CHR_PROPS_NOTIFY);
  hrmc.setPermission(SECMODE_OPEN, SECMODE_NO_ACCESS);
  hrmc.setFixedLen(sizeof(hrm_packet));
  hrmc.setCccdWriteCallback(cccd_callback);
  hrmc.begin();
}

void setup_HTM(void) {
  htms.begin();
  htmc.setProperties(CHR_PROPS_INDICATE);
  htmc.setPermission(SECMODE_OPEN, SECMODE_NO_ACCESS);
  htmc.setFixedLen(sizeof(htm_packet));
  htmc.setCccdWriteCallback(cccd_callback);
  htmc.begin();
}

void setup_IMU(void) {
  motion.begin();
  motionc.setProperties(CHR_PROPS_NOTIFY);
  motionc.setPermission(SECMODE_OPEN, SECMODE_NO_ACCESS);
  motionc.setFixedLen(sizeof(motion_packet));
  motionc.setCccdWriteCallback(cccd_callback);
  motionc.begin();
}

void setup_FSR(void) {
  fsr.begin();
  bite_forcec.setProperties(CHR_PROPS_NOTIFY);
  bite_forcec.setPermission(SECMODE_OPEN, SECMODE_NO_ACCESS);
  bite_forcec.setFixedLen(sizeof(fsr_packet));
  bite_forcec.setCccdWriteCallback(cccd_callback);
  bite_forcec.begin();
}

// Bluetooth Handler Functions
void start_adv(void) {
  Bluefruit.Advertising.addFlags(BLE_GAP_ADV_FLAGS_LE_ONLY_GENERAL_DISC_MODE);
  Bluefruit.Advertising.addTxPower();
  // The phone reads the name from the scan response. addName() on the main
  // packet is dropped when that packet is full, so Android then reports no name
  // and the app hides the board.
  Bluefruit.ScanResponse.addName();

  // Bluefruit.Advertising.addService(hrms);
  // Bluefruit.Advertising.addService(htms);
  // Bluefruit.Advertising.addService(motion);
  // Bluefruit.Advertising.addService(fsr);

  Bluefruit.Advertising.restartOnDisconnect(true);
  Bluefruit.Advertising.setInterval(32, 244);  // 20 ms to 152.5 ms
  Bluefruit.Advertising.setFastTimeout(30);
  Bluefruit.Advertising.start(0);
}

void connect_callback(uint16_t conn_handle) {
  BLEConnection *connection = Bluefruit.Connection(conn_handle);
  char central_name[32] = { 0 };
  connection->getPeerName(central_name, sizeof(central_name));
  Serial.print("Connected to ");
  Serial.println(central_name);
}

void disconnect_callback(uint16_t conn_handle, uint8_t reason) {
  Serial.print("Disconnected, reason = 0x");
  Serial.println(reason, HEX);
  Serial.println("Advertising!");
}

void cccd_callback(uint16_t conn_hdl, BLECharacteristic *chr, uint16_t cccd_value) {
  Serial.print("CCCD Updated: ");
  Serial.println(cccd_value);

  if (chr->uuid == hrmc.uuid && chr->notifyEnabled(conn_hdl)) {
    Serial.println("Mouthguard notify enabled");
  }
}

bool adc_init(void) {
  if (!ads.begin()) {
    Serial.println("Failed to initialize ADS.");
    return false;
  }
  Serial.println("Initialize ADS.");
  return true;
}

float get_temperature_C() {
  int16_t adc_raw = ads.readADC_SingleEnded(THM_PIN);
  float volts2 = ads.computeVolts(adc_raw);

  /* convert voltage to temperature */
  float temperatureC = voltageToTemperature(volts2);
  return temperatureC;
}

float get_temperature_F() {
  int16_t temperatureF = (get_temperature_C() * 9.0 / 5.0) + 32.0;
  return temperatureF;
}

float voltageToTemperature(float voltage) {
  /* calculate the thermistor resistance */
  float resistance = SERIES_RESISTOR * (3.3 / voltage - 1);

  /* steinhart-Hart equation to convert resistance to temperature */
  float steinhart;
  steinhart = resistance / THERMISTOR_NOMINAL;        // (R/Ro)
  steinhart = log(steinhart);                         // ln(R/Ro)
  steinhart /= BETA;                                  // 1/B * ln(R/Ro)
  steinhart += 1.0 / (TEMPERATURE_NOMINAL + 273.15);  // + (1/To)
  steinhart = 1.0 / steinhart;                        // Invert
  steinhart -= 273.15;                                // convert absolute temp to C

  return steinhart;
}

float get_force() {
  int16_t adc_raw = ads.readADC_SingleEnded(FSR_L_PIN);
  float volts2 = ads.computeVolts(adc_raw);

  if (volts2 <= 0.01) return 0.0;
  float rs = (RF * VREF) / volts2;
  float force = 0.0;
  if (rs < 1000000) {
    force = 111000.0 / rs;  // reverse-proportional approximation
  }

  return force;
}

void imu_init() {
  icmReady = icm.begin_I2C();
  if (!icmReady) {
    // if (!icm.begin_SPI(ICM_CS)) {
    // if (!icm.begin_SPI(ICM_CS, ICM_SCK, ICM_MISO, ICM_MOSI)) {

    Serial.println("Failed to find ICM20948 chip");
  }

  adxlReady = accel.begin();
  if (!adxlReady) {
    /* There was a problem detecting the ADXL375 ... check your connections */
    Serial.println("Ooops, no ADXL375 detected ... Check your wiring!");
    return;
  }
  accel.printSensorDetails();
  Serial.println("");
  if (!icmReady) return;

  Serial.println("ICM20948 Found!");
  // icm.setAccelRange(ICM20948_ACCEL_RANGE_16_G);
  Serial.print("Accelerometer range set to: ");
  switch (icm.getAccelRange()) {
    case ICM20948_ACCEL_RANGE_2_G:
      Serial.println("+-2G");
      break;
    case ICM20948_ACCEL_RANGE_4_G:
      Serial.println("+-4G");
      break;
    case ICM20948_ACCEL_RANGE_8_G:
      Serial.println("+-8G");
      break;
    case ICM20948_ACCEL_RANGE_16_G:
      Serial.println("+-16G");
      break;
  }
  Serial.println("OK");

  // icm.setGyroRange(ICM20948_GYRO_RANGE_2000_DPS);
  Serial.print("Gyro range set to: ");
  switch (icm.getGyroRange()) {
    case ICM20948_GYRO_RANGE_250_DPS:
      Serial.println("250 degrees/s");
      break;
    case ICM20948_GYRO_RANGE_500_DPS:
      Serial.println("500 degrees/s");
      break;
    case ICM20948_GYRO_RANGE_1000_DPS:
      Serial.println("1000 degrees/s");
      break;
    case ICM20948_GYRO_RANGE_2000_DPS:
      Serial.println("2000 degrees/s");
      break;
  }

  //  icm.setAccelRateDivisor(4095);
  uint16_t accel_divisor = icm.getAccelRateDivisor();
  float accel_rate = 1125 / (1.0 + accel_divisor);

  Serial.print("Accelerometer data rate divisor set to: ");
  Serial.println(accel_divisor);
  Serial.print("Accelerometer data rate (Hz) is approximately: ");
  Serial.println(accel_rate);

  //  icm.setGyroRateDivisor(255);
  uint8_t gyro_divisor = icm.getGyroRateDivisor();
  float gyro_rate = 1100 / (1.0 + gyro_divisor);

  Serial.print("Gyro data rate divisor set to: ");
  Serial.println(gyro_divisor);
  Serial.print("Gyro data rate (Hz) is approximately: ");
  Serial.println(gyro_rate);

  // icm.setMagDataRate(AK09916_MAG_DATARATE_10_HZ);
  Serial.print("Magnetometer data rate set to: ");
  switch (icm.getMagDataRate()) {
    case AK09916_MAG_DATARATE_SHUTDOWN:
      Serial.println("Shutdown");
      break;
    case AK09916_MAG_DATARATE_SINGLE:
      Serial.println("Single/One shot");
      break;
    case AK09916_MAG_DATARATE_10_HZ:
      Serial.println("10 Hz");
      break;
    case AK09916_MAG_DATARATE_20_HZ:
      Serial.println("20 Hz");
      break;
    case AK09916_MAG_DATARATE_50_HZ:
      Serial.println("50 Hz");
      break;
    case AK09916_MAG_DATARATE_100_HZ:
      Serial.println("100 Hz");
      break;
  }
  Serial.println();
}

void update_motion_data() {
  sensors_event_t accel16, gyro, mag, temp, accel200;

  if (icmReady) {
    icm.getEvent(&accel16, &gyro, &temp, &mag);

    // Gyroscope (radians/s → millidegrees/s or milliradians/s if you prefer)
    motion_data.gyro[0] = (int16_t)(gyro.gyro.x * 1000);  // scale to int16
    motion_data.gyro[1] = (int16_t)(gyro.gyro.y * 1000);
    motion_data.gyro[2] = (int16_t)(gyro.gyro.z * 1000);

    // Accelerometer (m/s² → milli-g approximation)
    motion_data.accel16[0] = (int16_t)(accel16.acceleration.x * 100);  // m/s² * 100
    motion_data.accel16[1] = (int16_t)(accel16.acceleration.y * 100);
    motion_data.accel16[2] = (int16_t)(accel16.acceleration.z * 100);

    // Magnetometer (µT → scaled)
    motion_data.mag[0] = (int16_t)(mag.magnetic.x * 10);  // e.g., 1 µT = 10 units
    motion_data.mag[1] = (int16_t)(mag.magnetic.y * 10);
    motion_data.mag[2] = (int16_t)(mag.magnetic.z * 10);
  }

  if (adxlReady) {
    accel.getEvent(&accel200);
    // High-G Accelerometer
    motion_data.accel200[0] = (int16_t)(accel200.acceleration.x * 1000);  // scale to int16
    motion_data.accel200[1] = (int16_t)(accel200.acceleration.y * 1000);
    motion_data.accel200[2] = (int16_t)(accel200.acceleration.z * 1000);
  }
}