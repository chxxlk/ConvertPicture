# Backend
# 📦 Picture Converter API

High-performance image conversion service built with **Bun**, **Sharp**, and **BullMQ** for scalable async processing.

---

## 🚀 Features

- Convert images (JPG, PNG, WEBP, dll)
- Async processing dengan queue (BullMQ + Redis)
- High concurrency handling
- Efficient processing pakai Sharp
- API contract yang jelas
- Sudah di-load test

---

## 🧠 Architecture Overview

Client → API Server → Queue (Redis) → Worker → Sharp Processing → Response

### Components:
- **API Server**: Nerima request
- **Queue (BullMQ)**: Manage job async
- **Worker**: Proses convert gambar
- **Sharp**: Engine processing

---

## 🛠️ Tech Stack

- Runtime: Bun
- Backend: Bun (Node-compatible)
- Queue: BullMQ
- Redis: Queue storage
- Image Processing: Sharp
- Frontend (optional): React + TailwindCSS

---

## ⚙️ Installation

### 1. Clone Repository
```bash
git clone https://github.com/your-username/picture-converter.git
cd picture-converter
```
### 2. Install Dependencies

```bash
bun install
```

### 3. To Run

```bash
cd backend
bun run dev
```
## 📡 API Usage
- Convert Image (Async)
  * Endpoint
    ```bash
    POST /convert
    ```
  * Request
    - multipart/form-data
    - field: image
    - param: format (png, jpg, webp, dll)
  * Response
    ```json
    {
      "jobId": "12345",
      "status": "queued"
    }
    ```
## ⚡ Performance
- Test
  - 100 concurrent sync request
  - 1000 async jobs
- Result
  - 0% error
  - Stabil di high load
  - Bottleneck di CPU (Sharp)
## 🧑‍💻 Author
Chris
