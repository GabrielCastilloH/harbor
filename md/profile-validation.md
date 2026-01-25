# 📋 Profile Validation & Requirements

## Profile Creation Requirements

### Images

- **Minimum**: 3 images required
- **Maximum**: 6 images allowed
- **Format**: JPEG only
- **Processing**: Auto-resized to 800x800 max, quality 80%
- **Moderation**: Automated content screening for inappropriate content
- **Storage**: Both original and 80% blurred versions stored in Firebase Storage

### Required Fields

All fields must be completed before profile creation:

- **Your Name, Initial(s) or Nickname**: 1-11 characters (enforced on backend)
- **Age**: 18+ years old
- **Gender**: Must select from dropdown (Male, Female, Non-Binary)
- **Sexual Orientation**: Must select from dropdown (Heterosexual, Homosexual, Bisexual, Pansexual)
- **Year Level**: Must select from dropdown (Freshman, Sophomore, Junior, Senior)
- **Major**: Must select from dropdown (85+ options)

### Text Field Limits

| Field                              | Min Length | Max Length | Description                       |
| ---------------------------------- | ---------- | ---------- | --------------------------------- |
| Your Name, Initial(s) or Nickname  | 1          | 11         | Your name, initial(s) or nickname |
| About Me                           | 5          | 180        | Personal description              |
| Q1: "Together we could"            | 5          | 100        | Shared activity                   |
| Q2: "Favorite book, movie or song" | 5          | 100        | Cultural preference               |
| Q3: "Some of my hobbies are"       | 5          | 100        | Personal interests                |

## Data Types Definition

```typescript
export type Profile = {
  uid?: string; // Firebase UID
  email: string;
  firstName: string;
  yearLevel: string;
  age: number;
  major: string;
  gender: string; // "Male", "Female", or "Non-Binary"
  sexualOrientation: string; // "Heterosexual", "Homosexual", "Bisexual", or "Pansexual"
  images: string[];
  aboutMe: string;
  q1: string; // "Together we could:"
  q2: string; // "Favorite book, movie or song:"
  q3: string; // "Some of my hobbies are:"
  availability: number; // For matching algorithm
  currentMatches?: string[];
  paywallSeen?: boolean;
  fcmToken?: string;
  expoPushToken?: string;
  isActive?: boolean; // Account status (enabled/disabled)
  isAvailable?: boolean; // Match availability (defaults to true, false when in active match)
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};
```
