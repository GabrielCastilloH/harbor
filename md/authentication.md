# 🔐 Authentication & Google Sign-In Flow

Harbor uses **Google Sign-In** for streamlined authentication, eliminating the need for email verification codes and providing a seamless user experience.

## Current Authentication Flow

The app has 4 distinct authentication states handled in `App.tsx`:

1. **User not signed in** → Auth screens (`SignIn` with Google Sign-In)
2. **User signed in but NO profile in database** → `AccountSetupScreen`
3. **User signed in AND has profile** → Main App (`TabNavigator`)
4. **User account deleted** → `DeletedAccountScreen`
5. **User account banned** → `BannedAccountScreen`

## Google Sign-In Implementation

### Overview

Harbor implements Google Sign-In using:

- **Firebase Auth Google provider** for secure authentication
- **Automatic email verification** through Google's verified email system
- **Seamless user experience** with one-tap sign-in
- **Cornell email validation** to ensure only Cornell students can join

### Authentication Flow

1. **User Signs In** (`SignIn.tsx`)

   ```typescript
   // Google Sign-In button triggers authentication
   const handleGoogleSignIn = async () => {
     const result = await GoogleSignin.signIn();
     const googleCredential = GoogleAuthProvider.credential(result.idToken);
     return signInWithCredential(auth, googleCredential);
   };
   ```

2. **Automatic Profile Creation**

   - User is automatically redirected to `AccountSetupScreen` if no profile exists
   - Profile creation process begins immediately after successful authentication

3. **Access Granted**
   - Once profile is complete, user can access full app features
   - No additional verification steps required
