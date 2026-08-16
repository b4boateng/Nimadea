# Use a lightweight, official Python image
FROM python:3.12-slim

# Prevent Python from writing .pyc files and force output to be logged immediately
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements file and install dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the project files into the container
COPY . /app/

# Expose port 8000 so the outside world can communicate with Django
EXPOSE 8000