# 🚨 Intrusion Detection System (IDS) — Kanna’s Project

## 📌 Overview

This project is a **real-time Intrusion Detection System (IDS)** designed to monitor network traffic, detect suspicious activities, and automatically respond to potential threats.

It implements a complete cybersecurity pipeline:

> **Detection → Enrichment → Risk Scoring → Response → Notification**

The system is built with a modular architecture and includes a **live monitoring dashboard** for visualization.

---

## ⚙️ Features

### 🔍 Real-Time Traffic Monitoring

* Captures live network packets using packet sniffing
* Processes IP-based traffic continuously

### 🚨 Threat Detection

* Port Scan Detection
* DoS / Traffic Flood Detection
* Flow-based anomaly detection
* Regex-based threat matching

### 📊 Risk Scoring Engine

* Assigns severity scores to detected events
* Aggregates multiple signals into actionable alerts

### ⚡ Automated Response System

* IP Blocking (Windows Firewall / iptables)
* Rate Limiting
* Action cooldown & suppression

### 📢 Notification System

* Sends alerts to SOC (Security Operations Center)
* Supports extensible notification configurations

### 🌐 Dashboard (Frontend)

* Built with React + Vite
* Real-time monitoring UI
* Alerts, events, and system metrics visualization

---

## 🏗️ Architecture

```
Packet Capture → Detection Engine → Risk Scoring → Response Manager → Supabase → Dashboard
```

---

## 🧰 Technologies Used

### Backend

* Python
* Scapy (Packet Capture)
* Requests (API Communication)

### Frontend

* React (Vite)
* TypeScript
* ShadCN UI

### Database & Backend Services

* Supabase (PostgreSQL + APIs)

### System Integration

* Windows Firewall (`netsh`)
* Linux (`iptables`)

---

## 🚀 Getting Started

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/Harishx5/Intrusion-Detection-System-.git
cd Intrusion-Detection-System-
```

---

### 2️⃣ Install Dependencies

#### Backend

```bash
pip install -r requirements.txt
```

#### Frontend

```bash
npm install
```

---

### 3️⃣ Run the Project

```bash
.\ids start
```

This will:

* Start the IDS backend engine
* Launch the frontend dashboard

---

## ⚠️ Important Notes

* Run the system with **Administrator privileges** for firewall actions
* Ensure correct **Supabase API keys** are configured
* Avoid blocking **local or trusted IPs** (use whitelist)

---

## 📂 Project Structure

```
├── detectors/           # Detection modules (DoS, Port Scan, etc.)
├── core/                # Core logic (baseline, tracking)
├── response_manager/    # Auto-response handling
├── utils/               # Helper utilities
├── frontend/            # React dashboard
├── logs/                # System logs
└── config.yaml          # Configuration file
```

---

## 🔧 Future Improvements

* Adaptive detection (dynamic thresholds)
* Enhanced correlation engine
* Improved alert deduplication
* Advanced visualization in dashboard

---

## 👨‍💻 Author

**Kanna (Harish)**
Computer Science Engineer
Focused on AI Systems & Cybersecurity

---

## 📜 License

This project is developed for educational and research purposes.
