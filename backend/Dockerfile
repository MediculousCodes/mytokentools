FROM python:3.11-slim

WORKDIR /app

# Disable interactive prompts
ENV DEBIAN_FRONTEND=noninteractive

# 1. Copy *only* the requirements file
COPY requirements.txt .

# 2. Install dependencies
# This is now its own layer. It will only re-run if `requirements.txt`
# changes. This is the key to fast rebuilds.
RUN python -m pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 3. Copy the rest of your application code
# When you change `app.py`, only this layer and subsequent ones
# will re-run. The slow `pip install` layer above will be cached.
COPY app.py .

# Expose port
EXPOSE 5000

# Run the application
CMD ["python", "app.py"]