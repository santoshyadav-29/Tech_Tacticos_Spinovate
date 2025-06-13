# Computer Vision Monitoring API

A professional FastAPI application for real-time computer vision monitoring with face detection, drowsiness detection, and posture analysis.

## Features

- **Real-time video streaming** with computer vision processing
- **Face detection** and distance measurement
- **Drowsiness detection** using Eye Aspect Ratio (EAR) and Mouth Aspect Ratio (MAR)
- **Posture monitoring** with pitch angle calculation
- **Session monitoring** with comprehensive analytics
- **Professional API structure** with proper separation of concerns

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Copy `.env.example` to `.env` and configure settings
4. Run the application:
   ```bash
   python -m app.main
   ```

## API Endpoints

### Health
- `GET /health/` - Health check
- `GET /health/ping` - Simple ping

### Video
- `GET /video/stream` - Video stream with CV processing
- `GET /video/metrics` - Current face metrics
- `GET /video/drowsiness` - Drowsiness detection status

### Monitoring
- `POST /monitoring/start` - Start monitoring session
- `POST /monitoring/stop` - Stop monitoring session
- `GET /monitoring/report` - Generate session report
- `GET /monitoring/status` - Current monitoring status

## Project Structure

```
app/
├── main.py                 # FastAPI application factory
├── core/
│   ├── config.py          # Application configuration
│   └── exceptions.py      # Custom exceptions
├── services/
│   ├── face_detection.py  # Face detection service
│   ├── drowsiness_detection.py # Drowsiness detection service
│   ├── monitoring.py      # Session monitoring service
│   └── video_stream.py    # Video streaming service
├── models/
│   └── schemas.py         # Pydantic models
├── api/routes/
│   ├── health.py          # Health check routes
│   ├── video.py           # Video processing routes
│   └── monitoring.py      # Monitoring routes
└── utils/
    └── calculations.py    # Mathematical calculations
```

## Configuration

All configuration is handled through environment variables and the `Settings` class in `app/core/config.py`. Key settings include:

- Camera settings (index, FPS)
- Detection thresholds (distance, brightness, posture)
- Fatigue detection parameters (EAR, MAR thresholds)

## Development

The application uses:
- **FastAPI** for the web framework
- **OpenCV** for computer vision
- **MediaPipe** for face detection and landmarks
- **Pydantic** for data validation
- **Threading** for concurrent processing

## Usage

1. Start the application
2. Access the video stream at `/video/stream`
3. Start monitoring with `POST /monitoring/start`
4. Get real-time metrics from various endpoints
5. Stop monitoring and generate reports

This structure provides a solid foundation for a production-ready computer vision monitoring system.