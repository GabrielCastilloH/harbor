export type RootStackParamList = {
  Chats: undefined;
  ChatScreen: undefined;
  ProfileScreen: {
    userId: string;
    matchId?: string | null;
  };
  ReportScreen: {
    reportedUserId: string;
    reportedUserEmail?: string;
    reportedUserName?: string;
  };
};
