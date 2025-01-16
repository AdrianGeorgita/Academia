export interface AuthRequest {
    username: string;
    password: string;
}

export interface AuthResponse {
    message: string;
    token: string;
    success: boolean;
}