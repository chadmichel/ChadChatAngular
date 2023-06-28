export interface Message {
  id: string;
  text: string;
  isMine: boolean;
  senderDisplayName: string;
  createdOn: Date;
  sequenceId: number;
}
