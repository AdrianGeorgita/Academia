import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import path from 'path';
import { AuthRequest, AuthResponse } from '../types/auth';

const PROTO_PATH = path.resolve(__dirname, './auth.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
});

type ServiceClient = {
    Login(
        request: AuthRequest,
        metadata: grpc.Metadata,
        callback: (error: Error | null, response: AuthResponse) => void
    ): void;
    Register(
        request: AuthRequest,
        metadata: grpc.Metadata,
        callback: (error: Error | null, response: AuthResponse) => void
    ): void;
}

const proto = grpc.loadPackageDefinition(packageDefinition);
const client = new (proto.auth as any).AuthService(
    'localhost:50051',
    grpc.credentials.createInsecure()
) as ServiceClient;

export { client };