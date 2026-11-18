/*
 * Smart Mouthguard firmware for the Nordic nRF52840 DK.
 *
 * Open this folder in the nRF Connect for VS Code extension.
 * Board: nrf52840dk/nrf52840
 *
 * The phone app looks for the name "Smart Mouthguard" and the same four
 * service IDs as GS/GS.ino. This board has no sensors, so each packet
 * carries a fixed stand-in number:
 *   heart 72 BPM, temperature 37.00 C, head 1.00 g, bite 150.00
 * LED1 blinks once a second while that is happening.
 */

#include <string.h>
#include <zephyr/kernel.h>
#include <zephyr/sys/printk.h>
#include <zephyr/drivers/gpio.h>
#include <zephyr/bluetooth/bluetooth.h>
#include <zephyr/bluetooth/conn.h>
#include <zephyr/bluetooth/gatt.h>
#include <zephyr/bluetooth/uuid.h>

#define HEART_SVC_UUID BT_UUID_DECLARE_128(BT_UUID_128_ENCODE(0xa329162e, 0xbf3d, 0x4f73, 0x9a1a, 0xbb8ccfe142e7))
#define HEART_CHR_UUID BT_UUID_DECLARE_128(BT_UUID_128_ENCODE(0x0a21fc6f, 0x6edb, 0x4086, 0x9460, 0x0eccb35150fb))

#define TEMP_SVC_UUID BT_UUID_DECLARE_128(BT_UUID_128_ENCODE(0xd2a95330, 0xd754, 0x4a5b, 0xbb74, 0xb1b09bef98f5))
#define TEMP_CHR_UUID BT_UUID_DECLARE_128(BT_UUID_128_ENCODE(0x6896072b, 0x24ce, 0x4982, 0xac6a, 0x899fa7183069))

#define MOTION_SVC_UUID BT_UUID_DECLARE_128(BT_UUID_128_ENCODE(0x5f07ce79, 0x170a, 0x4c45, 0xb8ca, 0xeae29004e45f))
#define MOTION_CHR_UUID BT_UUID_DECLARE_128(BT_UUID_128_ENCODE(0xd2e9a9c2, 0xa94b, 0x42cb, 0xb11d, 0xb76549e7a164))

#define BITE_SVC_UUID BT_UUID_DECLARE_128(BT_UUID_128_ENCODE(0x56f38df0, 0xe65b, 0x4190, 0xa3da, 0x9f941c9d1763))
#define BITE_CHR_UUID BT_UUID_DECLARE_128(BT_UUID_128_ENCODE(0xf86a2066, 0x5203, 0x4bed, 0xb090, 0xac0b89e68d81))

struct __attribute__((packed)) hrm_packet {
	uint8_t heart_rate;
	uint32_t timestamp;
};

struct __attribute__((packed)) htm_packet {
	int16_t temperature;
	uint32_t timestamp;
};

struct __attribute__((packed)) fsr_packet {
	int16_t left_bite;
	int16_t right_bite;
	uint32_t timestamp;
};

struct __attribute__((packed)) motion_packet {
	int16_t gyro[3];
	int16_t accel16[3];
	int16_t accel200[3];
	int16_t mag[3];
	uint16_t bite_l;
	uint16_t bite_r;
	uint32_t timestamp;
};

static bool heart_notify_on;
static bool temp_indicate_on;
static bool motion_notify_on;
static bool bite_notify_on;
static bool temp_indicate_busy;
static struct htm_packet temp_packet;
static struct bt_gatt_indicate_params temp_indicate;
static struct bt_conn *current_conn;

static const struct gpio_dt_spec led = GPIO_DT_SPEC_GET(DT_ALIAS(led0), gpios);

/* Sends as soon as the phone turns a packet on, instead of waiting for the 1 second loop. */
static void send_if_enabled(struct k_work *work);
static K_WORK_DEFINE(send_work, send_if_enabled);

static void heart_ccc_changed(const struct bt_gatt_attr *attr, uint16_t value)
{
	ARG_UNUSED(attr);
	heart_notify_on = (value == BT_GATT_CCC_NOTIFY);
	printk("Heart notify %s\n", heart_notify_on ? "on" : "off");
	if (heart_notify_on) {
		k_work_submit(&send_work);
	}
}

static void temp_ccc_changed(const struct bt_gatt_attr *attr, uint16_t value)
{
	ARG_UNUSED(attr);
	temp_indicate_on = (value == BT_GATT_CCC_INDICATE);
	printk("Temp indicate %s\n", temp_indicate_on ? "on" : "off");
	if (temp_indicate_on) {
		k_work_submit(&send_work);
	}
}

static void motion_ccc_changed(const struct bt_gatt_attr *attr, uint16_t value)
{
	ARG_UNUSED(attr);
	motion_notify_on = (value == BT_GATT_CCC_NOTIFY);
	printk("Motion notify %s\n", motion_notify_on ? "on" : "off");
	if (motion_notify_on) {
		k_work_submit(&send_work);
	}
}

static void bite_ccc_changed(const struct bt_gatt_attr *attr, uint16_t value)
{
	ARG_UNUSED(attr);
	bite_notify_on = (value == BT_GATT_CCC_NOTIFY);
	printk("Bite notify %s\n", bite_notify_on ? "on" : "off");
	if (bite_notify_on) {
		k_work_submit(&send_work);
	}
}

BT_GATT_SERVICE_DEFINE(heart_svc,
	BT_GATT_PRIMARY_SERVICE(HEART_SVC_UUID),
	BT_GATT_CHARACTERISTIC(HEART_CHR_UUID,
			       BT_GATT_CHRC_NOTIFY,
			       BT_GATT_PERM_NONE,
			       NULL, NULL, NULL),
	BT_GATT_CCC(heart_ccc_changed, BT_GATT_PERM_READ | BT_GATT_PERM_WRITE),
);

BT_GATT_SERVICE_DEFINE(temp_svc,
	BT_GATT_PRIMARY_SERVICE(TEMP_SVC_UUID),
	BT_GATT_CHARACTERISTIC(TEMP_CHR_UUID,
			       BT_GATT_CHRC_INDICATE,
			       BT_GATT_PERM_NONE,
			       NULL, NULL, NULL),
	BT_GATT_CCC(temp_ccc_changed, BT_GATT_PERM_READ | BT_GATT_PERM_WRITE),
);

BT_GATT_SERVICE_DEFINE(motion_svc,
	BT_GATT_PRIMARY_SERVICE(MOTION_SVC_UUID),
	BT_GATT_CHARACTERISTIC(MOTION_CHR_UUID,
			       BT_GATT_CHRC_NOTIFY,
			       BT_GATT_PERM_NONE,
			       NULL, NULL, NULL),
	BT_GATT_CCC(motion_ccc_changed, BT_GATT_PERM_READ | BT_GATT_PERM_WRITE),
);

BT_GATT_SERVICE_DEFINE(bite_svc,
	BT_GATT_PRIMARY_SERVICE(BITE_SVC_UUID),
	BT_GATT_CHARACTERISTIC(BITE_CHR_UUID,
			       BT_GATT_CHRC_NOTIFY,
			       BT_GATT_PERM_NONE,
			       NULL, NULL, NULL),
	BT_GATT_CCC(bite_ccc_changed, BT_GATT_PERM_READ | BT_GATT_PERM_WRITE),
);

static int start_advertising(void)
{
	const struct bt_data ad[] = {
		BT_DATA_BYTES(BT_DATA_FLAGS, (BT_LE_AD_GENERAL | BT_LE_AD_NO_BREDR)),
	};
	const struct bt_data sd[] = {
		BT_DATA(BT_DATA_NAME_COMPLETE, CONFIG_BT_DEVICE_NAME,
			sizeof(CONFIG_BT_DEVICE_NAME) - 1),
	};

	return bt_le_adv_start(BT_LE_ADV_CONN_FAST_1, ad, ARRAY_SIZE(ad), sd, ARRAY_SIZE(sd));
}

/* A disconnect stops advertising. Without this, the phone cannot connect again until RESET. */
static void advertise_again(struct k_work *work)
{
	int err = start_advertising();

	ARG_UNUSED(work);
	if (err) {
		printk("Advertising failed to restart: %d\n", err);
		return;
	}
	printk("Advertising again\n");
}

static K_WORK_DEFINE(adv_work, advertise_again);

static void connected(struct bt_conn *conn, uint8_t err)
{
	if (err) {
		printk("Connect failed %u\n", err);
		return;
	}
	current_conn = bt_conn_ref(conn);
	printk("Phone connected\n");
}

static void disconnected(struct bt_conn *conn, uint8_t reason)
{
	printk("Phone disconnected, reason %u\n", reason);
	if (current_conn) {
		bt_conn_unref(current_conn);
		current_conn = NULL;
	}
	heart_notify_on = false;
	temp_indicate_on = false;
	motion_notify_on = false;
	bite_notify_on = false;
	temp_indicate_busy = false;
	ARG_UNUSED(conn);
	k_work_submit(&adv_work);
}

BT_CONN_CB_DEFINE(conn_callbacks) = {
	.connected = connected,
	.disconnected = disconnected,
};

static void notify_packet(const char *name, const struct bt_gatt_attr *attr,
			  const void *data, uint16_t len)
{
	int err = bt_gatt_notify(current_conn, attr, data, len);

	if (err) {
		printk("%s notify failed: %d\n", name, err);
	}
}

static void temp_indicate_done(struct bt_gatt_indicate_params *params)
{
	ARG_UNUSED(params);
	temp_indicate_busy = false;
}

static void send_heart(uint32_t now)
{
	struct hrm_packet packet = {
		.heart_rate = 72,
		.timestamp = now,
	};

	/* attrs[2] is the characteristic value. 0 is the service, 1 is the declaration. */
	notify_packet("Heart", &heart_svc.attrs[2], &packet, sizeof(packet));
}

static void send_temp(uint32_t now)
{
	int err;

	if (temp_indicate_busy) {
		return;
	}

	/* 3700 means 37.00 C. The phone turns that into 98.6 F. */
	temp_packet.temperature = 3700;
	temp_packet.timestamp = now;

	memset(&temp_indicate, 0, sizeof(temp_indicate));
	temp_indicate.attr = &temp_svc.attrs[2];
	temp_indicate.data = &temp_packet;
	temp_indicate.len = sizeof(temp_packet);
	temp_indicate.destroy = temp_indicate_done;
	temp_indicate_busy = true;

	err = bt_gatt_indicate(current_conn, &temp_indicate);
	if (err) {
		temp_indicate_busy = false;
		printk("Temp indicate failed: %d\n", err);
	}
}

static void send_motion(uint32_t now)
{
	struct motion_packet packet = {0};

	/* accel16 is m/s² × 100. 981 on Z is 9.81 m/s², which the phone shows as 1.00 g. */
	packet.accel16[2] = 981;
	packet.timestamp = now;
	notify_packet("Motion", &motion_svc.attrs[2], &packet, sizeof(packet));
}

static void send_bite(uint32_t now)
{
	struct fsr_packet packet = {
		.left_bite = 15000,
		.right_bite = 8000,
		.timestamp = now,
	};

	/* 15000 means 150.00. The phone keeps the larger of the two sides. */
	notify_packet("Bite", &bite_svc.attrs[2], &packet, sizeof(packet));
}

static void send_if_enabled(struct k_work *work)
{
	uint32_t now = k_uptime_get_32();

	ARG_UNUSED(work);
	if (!current_conn) {
		return;
	}
	if (heart_notify_on) {
		send_heart(now);
	}
	if (temp_indicate_on) {
		send_temp(now);
	}
	if (motion_notify_on) {
		send_motion(now);
	}
	if (bite_notify_on) {
		send_bite(now);
	}
	printk("Sent packets\n");
}

int main(void)
{
	int err;

	if (!gpio_is_ready_dt(&led)) {
		printk("LED is not ready\n");
		return 0;
	}
	gpio_pin_configure_dt(&led, GPIO_OUTPUT_INACTIVE);

	err = bt_enable(NULL);
	if (err) {
		printk("Bluetooth failed to start: %d\n", err);
		return 0;
	}

	err = start_advertising();
	if (err) {
		printk("Advertising failed to start: %d\n", err);
		return 0;
	}

	printk("Setup complete. Advertising...\n");

	while (1) {
		uint32_t now = k_uptime_get_32();

		gpio_pin_toggle_dt(&led);
		if (current_conn && heart_notify_on) {
			send_heart(now);
		}
		if (current_conn && temp_indicate_on) {
			send_temp(now);
		}
		if (current_conn && motion_notify_on) {
			send_motion(now);
		}
		if (current_conn && bite_notify_on) {
			send_bite(now);
		}
		k_msleep(1000);
	}
}
