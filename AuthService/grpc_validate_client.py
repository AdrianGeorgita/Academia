from concurrent import futures
import grpc
import auth_pb2
import auth_pb2_grpc


def consume(jwt):
    with grpc.insecure_channel("localhost:50051") as channel:
        stub = auth_pb2_grpc.AuthenticationStub(channel)
        response = stub.Validate(auth_pb2.ValidationRequest(jws=jwt))

    print("Result: " + str(response.status))


if __name__ == '__main__':
    jwt = input("Token: ")
    consume(jwt)
