# Text File Token Counter

A simple web application that counts tokens in text files using OpenAI's tiktoken library. The application consists of a frontend served by nginx and a backend Flask API, both running in separate Docker containers.

## Features

- Upload `.txt` files and calculate token count
- Uses OpenAI's `cl100k_base` encoding (same as GPT-4)
- Clean, modern UI with responsive design
- Dockerized frontend and backend for easy deployment
- Educational content about tokenization

## Prerequisites

- Docker
- Docker Compose

## Quick Start

1. **Clone or download this project**

2. **Start the application:**
   \`\`\`bash
   docker-compose up --build
   \`\`\`

3. **Access the application:**
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:5000

4. **Stop the application:**
   \`\`\`bash
   docker-compose down
   \`\`\`

## Project Structure

\`\`\`
.
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app.py
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── index.html
│   ├── styles.css
│   └── script.js
├── docker-compose.yml
└── README.md
\`\`\`

## Architecture

- **Frontend Container**: Nginx serving static HTML, CSS, and JavaScript
- **Backend Container**: Python Flask API with tiktoken for token counting
- **Network**: Both containers communicate via a Docker bridge network

## API Endpoints

### POST /tokenize
Calculate token count for provided text.

**Request:**
\`\`\`json
{
  "text": "Your text here"
}
\`\`\`

**Response:**
\`\`\`json
{
  "token_count": 1234
}
\`\`\`

### GET /health
Health check endpoint.

**Response:**
\`\`\`json
{
  "status": "healthy"
}
\`\`\`

## Development

### Running Backend Locally (without Docker)

\`\`\`bash
cd backend
pip install -r requirements.txt
python app.py
\`\`\`

### Running Frontend Locally (without Docker)

Simply open `frontend/index.html` in a browser, or use a local server:

\`\`\`bash
cd frontend
python -m http.server 8080
\`\`\`

## Token Estimation

As a rule of thumb for English text:
- **100 tokens ≈ 75 words**
- A typical sentence (15-20 words) ≈ 20-25 tokens

## Technologies Used

- **Frontend**: HTML5, CSS3, Vanilla JavaScript, Nginx
- **Backend**: Python, Flask, tiktoken, Flask-CORS
- **Containerization**: Docker, Docker Compose

## License

MIT License - feel free to use this project for learning or production purposes.
