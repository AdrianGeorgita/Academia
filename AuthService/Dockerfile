FROM python:3.9-slim

RUN apt-get update && apt-get install -y pkg-config libmariadb-dev build-essential

WORKDIR /app

# Copy the requirements and install dependencies
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire codebase into the container
COPY . /app/

# Expose the gRPC server port
EXPOSE 50051

# Command to run the gRPC server
CMD ["python", "grpc_server.py"]
