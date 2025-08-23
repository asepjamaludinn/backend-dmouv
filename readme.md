# D'Mouv – Smart Detection (Backend)

Selamat datang di repositori backend untuk proyek **D'Mouv – Smart Detection**. Proyek ini adalah sistem IoT berbasis Node.js yang mengintegrasikan deteksi gerakan (melalui kamera) dengan kontrol perangkat pintar seperti lampu dan kipas.

Sistem ini dirancang untuk dapat diakses oleh banyak pengguna secara real-time melalui web atau aplikasi mobile, dengan notifikasi instan, riwayat kejadian, dan mode kontrol yang fleksibel (Manual, Otomatis, dan Terjadwal).

## ✨ Fitur Utama (Main Features)

- **Manajemen Akun:** Registrasi, Login (JWT), Edit Profil (username, password, avatar), dan Lupa Password.
- **Manajemen Perangkat:** Onboarding perangkat baru (Lampu & Kipas) dan kontrol manual ON/OFF.
- **Mode Otomatisasi:**
  - **Mode Otomatis:** Menyalakan/mematikan perangkat berdasarkan deteksi gerakan dari MQTT.
  - **Mode Jadwal:** Mengatur jadwal ON/OFF perangkat berdasarkan hari dan jam.
- **Notifikasi Real-time:** Notifikasi instan dikirim ke semua pengguna melalui WebSockets (Socket.IO) untuk setiap kejadian penting (deteksi gerakan, aksi manual, jadwal).
- **Riwayat Sensor:** Mencatat semua aktivitas perangkat ke dalam database untuk audit dan analisis.
- **Keamanan:** Dilengkapi dengan standar keamanan dasar seperti Helmet, Rate Limiting, dan otentikasi di semua endpoint penting.

## 🛠️ Teknologi yang Digunakan (Tech Stack)

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Komunikasi IoT:** MQTT
- **Komunikasi Real-time:** Socket.IO
- **Otentikasi:** JSON Web Tokens (JWT)
- **Penyimpanan File:** Supabase Storage (untuk avatar profil)
- **Validasi:** `express-validator`
- **Kontainerisasi:** Docker & Docker Compose

## Prerequisites

Sebelum memulai, pastikan Anda telah menginstal software berikut:

- [Node.js](https://nodejs.org/) (v18 atau lebih baru)
- [NPM](https://www.npmjs.com/) atau [Yarn](https://yarnpkg.com/)
- [Docker](https://www.docker.com/products/docker-desktop/) dan Docker Compose
- Akun [Supabase](https://supabase.com/) (untuk URL Database PostgreSQL dan Storage)
- [Postman](https://www.postman.com/downloads/) (untuk pengujian API)

## ⚙️ Instalasi & Konfigurasi (Installation & Setup)

Ikuti langkah-langkah berikut untuk menjalankan proyek ini di lingkungan lokal Anda.

1.  **Clone Repositori**

    ```bash
    git clone [https://github.com/your-username/backend-dmouv.git](https://github.com/your-username/backend-dmouv.git)
    cd backend-dmouv
    ```

2.  **Install Dependensi**

    ```bash
    npm install
    ```

3.  **Konfigurasi Variabel Lingkungan**

    - Buat salinan dari file `.env.example` (jika ada) atau buat file baru bernama `.env`.
    - Isi file `.env` dengan kredensial Anda. Lihat bagian **Variabel Lingkungan** di bawah untuk detailnya.

4.  **Jalankan Migrasi Database**
    - Pastikan `DATABASE_URL` di file `.env` Anda sudah benar.
    - Jalankan perintah berikut untuk membuat tabel-tabel di database Anda sesuai dengan `schema.prisma`.
    ```bash
    npx prisma migrate dev --name init
    ```

## 📄 Variabel Lingkungan (`.env`)

Berikut adalah template untuk file `.env` Anda. Ganti nilai placeholder dengan kredensial Anda yang sebenarnya.

```env
# URL Database dari Supabase (Connection Pooling)
DATABASE_URL="postgresql://user:password@host:port/postgres?pgbouncer=true"

# URL Database dari Supabase (Direct Connection)
DIRECT_URL="postgresql://user:password@host:port/postgres"

# Port untuk server Express
PORT=2000

# Lingkungan Aplikasi (development atau production)
NODE_ENV=development

# Kunci Rahasia untuk Tanda Tangan JWT (buat string acak yang sangat panjang)
JWT_SECRET="your_super_long_and_random_jwt_secret_key"
JWT_EXPIRES_IN="24h"

# Kredensial Supabase (untuk upload gambar profil)
SUPABASE_URL="https://your_project_id.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"

# Konfigurasi MQTT Broker
# Jika menggunakan Docker, ini adalah nama service di docker-compose.yml
MQTT_BROKER_URL="mqtt://mosquitto"
MQTT_USERNAME=""
MQTT_PASSWORD=""
```

## 🚀 Menjalankan Aplikasi (Running the Application)

Anda bisa menjalankan aplikasi ini dengan dua cara:

1.  Menggunakan Docker (Direkomendasikan)
    Ini adalah cara termudah karena sudah mencakup database (opsional) dan MQTT Broker. Pastikan Docker Desktop sedang berjalan.

        docker-compose up --build
        Server akan berjalan di http://localhost:2000.

2.  Mode Pengembangan Lokal
    Jika Anda ingin menjalankan server secara langsung tanpa Docker, pastikan Anda memiliki instance PostgreSQL dan MQTT Broker yang berjalan secara terpisah di mesin Anda.

        Ubah MQTT_BROKER_URL di file .env Anda menjadi mqtt://localhost.`

        npm run dev

    Server akan berjalan di `http://localhost:2000.`

## 🗂️ Struktur Proyek (Project Structure)

```
├── prisma/
│ └── schema.prisma # Skema database
├── src/
│ ├── config/ # Konfigurasi (database)
│ ├── controllers/ # Logika untuk menangani request & response
│ ├── middleware/ # Middleware (otentikasi)
│ ├── routes/ # Definisi endpoint API
│ ├── services/ # Logika bisnis inti
│ └── utils/ # Utilitas (validasi)d
├── .env # Variabel lingkungan
├── app.js # Konfigurasi utama Express
├── docker-compose.yml # Konfigurasi Docker
├── Dockerfile # Definisi image Docker untuk aplikasi
└── server.js # Titik masuk utama aplikasi

```
