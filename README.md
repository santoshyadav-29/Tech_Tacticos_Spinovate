#Spinovate: Posture Correction System

## 📌 Project Description

The Posture Correction System is an innovative tool designed to help users maintain proper posture while using a computer. Leveraging a standard webcam, the system:

- Captures **head angle** and **user distance** to the camera in real-time.
- Estimates critical posture-related medical angles:
  - **Upper thoracic kyphosis angle**
  - **Middle thoracic kyphosis angle**
  - **Lower thoracic kyphosis angle**
  - **Lumbar lordosis angle**
  - **T1 slope**
  - **Degree of anteversion of the cervical spine**
- Alerts users immediately when posture deviates from medically acceptable ranges.
- Provides **instantaneous posture assessment** comparable to what orthopedists calculate manually.
- The system's estimations are **qualitatively verified by physicians** to ensure accuracy and medical relevance.

## 🚀 Features

- Real-time posture monitoring through webcam
- Two-factor posture estimation (head angle + distance)
- Instant feedback to correct posture
- Medical angle estimation commonly used by orthopedists
- Physician-verified posture detection logic

## 🛠️ Tech Stack

> *To be decided*

<!-- Example placeholder for future stack info:
- Python (OpenCV, Mediapipe)
- JavaScript (Electron, React)
- TensorFlow / PyTorch for ML models
- Flask / FastAPI backend
- SQLite / Firebase
-->

## 📷 How It Works

1. The system accesses the webcam feed.
2. Processes head angle and distance data.
3. Calculates posture angles in real time.
4. Triggers an alert if posture is incorrect.

## ⚙️ Installation

> *Instructions to be added once the tech stack and architecture are finalized.*

<!-- Example placeholder:
```bash
git clone https://github.com/yourusername/spinovate-posture-correction.git
cd spinovate-posture-correction
pip install -r requirements.txt
python app.py
