export interface HMRServer {
    waitUntilNextEmission(): Promise<void>
    close(): Promise<void>
}