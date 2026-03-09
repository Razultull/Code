export interface SlackMessage {
  type: "dm" | "channel";
  channel: string;
  channelName: string;
  user: string;
  userName: string;
  text: string;
  timestamp: string;
  reactions?: Array<{ name: string; count: number }>;
  threadReplyCount?: number;
  permalink?: string;
}

export interface SlackFile {
  id: string;
  name: string;
  fileType: "pdf" | "gdoc" | "gsheet" | "gslides" | "canvas" | "image" | "other";
  sharedBy: string;
  sharedIn: string;
  timestamp: string;
  url: string;
  permalink?: string;
}

export interface SlackThread {
  id: string;
  channel: string;
  channelName: string;
  parentUserName: string;
  parentText: string;
  parentTs: string;
  latestReplyUserName: string;
  latestReplyText: string;
  latestReplyTs: string;
  replyCount: number;
  permalink?: string;
}
