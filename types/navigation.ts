export type RootStackParamList = {
  HomeScreen: undefined;
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
    matchId: string;
  };
};

export type AuthStackParamList = {
  SignIn: undefined;
  CreateAccount: undefined;
  EmailVerification: {
    email: string;
    fromSignIn?: boolean;
  };
  AccountSetup: undefined;
};
