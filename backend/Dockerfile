FROM python:3.11-slim

WORKDIR /app

# Disable interactive prompts during package installs and set noninteractive frontend
ENV DEBIAN_FRONTEND=noninteractive

# Install system build dependencies and rust for building tiktoken
COPY requirements.txt .
RUN python -m pip install --upgrade pip setuptools wheel && \
	pip install --no-cache-dir -r requirements.txt || true
# Install Python deps
COPY app.py .

# Copy application code
COPY app.py .
# Install Python deps using upgraded pip
RUN pip install --no-cache-dir -r requirements.txt || true

# Expose port
EXPOSE 5000

# Run the application
CMD ["python", "app.py"]
