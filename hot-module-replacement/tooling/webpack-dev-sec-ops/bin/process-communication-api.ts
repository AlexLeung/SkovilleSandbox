export type ProcessCommunicationMessage = 
    {   type: ProcessCommunicationMessageType.Restart; } |
    {   type: ProcessCommunicationMessageType.UpdateRequest;
        data: {
            publicPath: string;
            assets: string[];
            sequenceNumber: number;
        };
    } | 
    {   type: ProcessCommunicationMessageType.UpdateResponse;
        data: {
            sequenceNumber: number;
        };
    };

export enum ProcessCommunicationMessageType {
    Restart = 'restart',
    UpdateRequest = 'update-request',
    UpdateResponse = 'update-response'
}