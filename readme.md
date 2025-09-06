# D'Mouv – Smart Detection Backend 🚀

Selamat datang di repositori backend untuk proyek **D'Mouv – Smart Detection**.  
Ini adalah sistem IoT yang tangguh yang dibangun dengan **Node.js**, dirancang untuk mengintegrasikan deteksi gerakan real-time dari perangkat fisik dengan kontrol rumah pintar seperti **lampu** dan **kipas**.

Sistem ini mendukung banyak pengguna melalui aplikasi mobile, dengan fitur **notifikasi instan**, **riwayat kejadian**, dan mode kontrol yang fleksibel (Manual, Otomatis, dan Terjadwal).

---

## 🏛️ Arsitektur Sistem
Proyek ini mengikuti arsitektur **decoupled** untuk memastikan **skalabilitas** dan **kemudahan pemeliharaan**.  

```mermaid
flowchart LR
  IoT["Perangkat IoT (Python/YOLO)"] <--> MQTT["Broker MQTT"]
  MQTT <--> Backend["Backend Node.js"]
  Backend <--> DB["Database PostgreSQL"]
  Backend <--> |"WebSockets"| FE["Frontend React Native"]
````

* **Perangkat IoT**: Menangkap video, melakukan deteksi pose, mempublikasikan data status/sensor ke broker MQTT, dan menerima perintah dari backend.
* **Broker MQTT**: Pusat komunikasi semua perangkat IoT.
* **Backend**: Otak sistem. Memproses data dari MQTT, mengelola database, menangani logika bisnis, dan mengirim real-time update ke frontend.
* **Frontend**: Antarmuka pengguna berbasis React Native.

---

## ✨ Fitur Utama

* 👤 **Manajemen Pengguna & Otentikasi**

  * Registrasi & login aman menggunakan **JWT**
  * Edit profil (username, password, avatar)
  * Reset password

* 🕹️ **Manajemen Perangkat**

  * Onboarding otomatis perangkat baru
  * Kontrol manual ON/OFF (khusus superuser)

* 🧠 **Mode Otomatisasi Cerdas**

  * **Otomatis**: perangkat ON/OFF berdasarkan deteksi gerakan
  * **Jadwal**: atur jadwal harian untuk ON/OFF

* ⚡ **Notifikasi Real-time**

  * Melalui **WebSockets (Socket.IO)**
  * Event: deteksi gerakan, aksi manual, jadwal, status perangkat

* 📖 **Riwayat Komprehensif**

  * Semua aktivitas sensor & perangkat dicatat
  * API dengan filter & pagination

* 🔒 **Keamanan**

  * Helmet (proteksi header)
  * Rate limiting (anti brute-force)
  * Role-based access (User vs Superuser)

---

## 🛠️ Tumpukan Teknologi

* **Runtime**: Node.js
* **Framework**: Express.js
* **Database**: PostgreSQL + Prisma ORM
* **IoT Communication**: MQTT
* **Realtime**: Socket.IO
* **Auth**: JWT + bcrypt.js
* **File Storage**: Supabase Storage
* **Validation**: express-validator
* **Containerization**: Docker & Docker Compose

---

## ⚙️ Prasyarat

- [Node.js](https://nodejs.org/) (v18 atau lebih baru)
- [NPM](https://www.npmjs.com/) atau [Yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/products/docker-desktop/) dan Docker Compose
- Akun [Supabase](https://supabase.com/) (untuk URL Database PostgreSQL dan Storage)
- [Postman](https://www.postman.com/downloads/) (untuk pengujian API)

---

## 🚀 Instalasi & Pengaturan

### 1. Clone Repository

```bash
git clone https://github.com/asepjamaludinn/backend-dmouv.git
cd backend-dmouv
```


### 2. Install Dependensi

```bash
npm install
```

### 3. Konfigurasi `.env`

Buat file `.env` di root project berdasarkan `.env.example`.
Contoh:

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres?schema=public"
DIRECT_URL="postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres?schema=public"

PORT=3000
NODE_ENV=development

JWT_SECRET="your_super_long_and_random_jwt_secret_key"
JWT_EXPIRES_IN="24h"

SUPABASE_URL="https://your_project_id.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"

MQTT_BROKER="broker.emqx.io"
MQTT_PORT=8883
MQTT_USERNAME="your_mqtt_username"
MQTT_PASSWORD="your_mqtt_password"

SUPERUSER_EMAIL="superuser@example.com"
SUPERUSER_PASSWORD="a_very_strong_password"

FRONTEND_URL="http://localhost:8081"
DATA_RETENTION_DAYS=30
```

### 4. Migrasi Database

```bash
npx prisma migrate dev --name init
```

### 5. Seed Database

```bash
npx prisma db seed
```

---

## 🚀 Menjalankan Aplikasi

### Menggunakan Docker (Direkomendasikan)

```bash
docker-compose up --build
```

Server: [http://localhost:3000](http://localhost:3000)

### Mode Pengembangan Lokal

Jalankan Node.js langsung:

```bash
npm run dev
```

---

## 🗂️ Struktur Proyek

```
├── prisma/
│   ├── schema.prisma   # Skema database
│   └── seed.js         # Script seed superuser
├── src/
│   ├── config/         # Konfigurasi database & server
│   ├── controllers/    # Controller Express
│   ├── middleware/     # Middleware (auth, role)
│   ├── routes/         # Routing API
│   ├── services/       # Logika bisnis
│   └── utils/          # Helper & validasi
├── .env.example        # Template env
├── app.js              # Setup Express
├── docker-compose.yml  # Service Docker
├── Dockerfile          # Build image backend
└── server.js           # Entry point
```

---

## 📖 Endpoint API

<details>
<summary>Klik untuk melihat daftar endpoint</summary>

| Endpoint                                 | Method | Deskripsi                  | Akses     |
| ---------------------------------------- | ------ | -------------------------- | --------- |
| /api/auth/create-user                    | POST   | Membuat user baru          | Superuser |
| /api/auth/login                          | POST   | Login & dapatkan JWT       | Publik    |
| /api/auth/forgot-password                | POST   | Reset password             | Publik    |
| /api/auth/profile                        | GET    | Profil user saat ini       | Pribadi   |
| /api/auth/profile                        | PUT    | Update profil              | Pribadi   |
| /api/auth/upload-profile-picture         | POST   | Upload avatar              | Pribadi   |
| /api/device                              | GET    | List perangkat             | Pribadi   |
| /api/device/onboarding                   | POST   | Registrasi perangkat baru  | Superuser |
| /api/device/\:deviceId/action            | POST   | Kontrol manual perangkat   | Superuser |
| /api/settings/\:deviceId                 | GET    | Ambil pengaturan perangkat | Pribadi   |
| /api/settings/\:deviceId                 | PATCH  | Update pengaturan          | Superuser |
| /api/settings/\:deviceId/schedules       | POST   | Tambah/ubah jadwal         | Superuser |
| /api/settings/\:deviceId/schedules/\:day | DELETE | Hapus jadwal               | Superuser |
| /api/sensorHistory                       | GET    | Riwayat sensor             | Pribadi   |
| /api/notifications                       | GET    | Semua notifikasi           | Pribadi   |
| /api/notifications/unread-count          | GET    | Jumlah notifikasi unread   | Pribadi   |
| /api/notifications/mark-all-as-read      | POST   | Tandai semua sudah dibaca  | Pribadi   |
| /api/notifications/\:id                  | DELETE | Hapus notifikasi tertentu  | Pribadi   |

</details>

---

## 📡 Komunikasi MQTT & WebSocket

### Topik MQTT

* `iot/+/status` → subscribe status online/offline perangkat
* `iot/+/sensor` → subscribe data sensor (motion\_detected, motion\_cleared)
* `iot/{uniqueId}/action` → publish perintah (turn\_on, turn\_off)
* `iot/{uniqueId}/settings/update` → publish update mode perangkat

### Event Socket.IO

* `new_notification` → notifikasi baru
* `devices_updated` → status perangkat berubah
* `device_added` → perangkat baru ditambahkan
* `settings_updated` → perubahan pengaturan
* `device_operational_status_updated` → perangkat ON/OFF
* `motion_status_updated` → status gerakan terdeteksi

---
