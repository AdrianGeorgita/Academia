import { client } from "../grpc/grpc_client";
import { AuthRequest, AuthResponse } from "../types/auth";
import * as grpc from '@grpc/grpc-js';

export async function login(username: string, password: string): Promise<AuthResponse> {
    return new Promise((resolve, reject) => {
        const metadata = new grpc.Metadata();
        client.Login(
            { username, password },
            metadata,
            (error: Error | null, response: AuthResponse) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            }
        );
    });
}

export async function register(username: string, password: string): Promise<AuthResponse> {
    return new Promise((resolve, reject) => {
        const metadata = new grpc.Metadata();
        client.Register(
            { username, password },
            metadata,
            (error: Error | null, response: AuthResponse) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            }
        );
    });
}