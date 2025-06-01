export enum StepKind {
  welcome,
  register,
  accountSetup,
  dashboard,
  success,
  sendEmail,
  mintNFT,
  collectEmail,
}

export type StepMeta = {
  path: string;
  kind: StepKind;
  title: string;
  description: string;
  headerIcon?: string;
  index: number;
  backUrl?: string;
};

export const stepsMeta: Record<StepKind, StepMeta> = {
  [StepKind.welcome]: {
    path: "",
    kind: StepKind.welcome,
    title: "Czech Out",
    description: "No wait and just chezhout",
    index: 0,
  },
  [StepKind.register]: {
    path: "register",
    kind: StepKind.register,
    title: "Register",
    description: "",
    index: 1,
    backUrl: "",
  },
  [StepKind.accountSetup]: {
    path: "account-setup",
    kind: StepKind.accountSetup,
    title: "Secure Your Account",
    description:
      "Register credentials on-chain and setup EIP-7702 delegation for secure face + PIN transactions",
    index: 2,
  },
  [StepKind.success]: {
    path: "success",
    kind: StepKind.success,
    title: "Success 🎉",
    description:
      "Your account is now a 7702 smart account<br />Try sending transactions with face recognition and pin",
    index: 3,
  },
  [StepKind.dashboard]: {
    path: "dashboard",
    kind: StepKind.dashboard,
    title: "Dashboard",
    description: "",
    index: 4,
    backUrl: "register",
  },
  [StepKind.sendEmail]: {
    path: "sendEmail",
    kind: StepKind.sendEmail,
    title: "Reset PIN",
    description: "Enter your email to reset your PIN",
    index: 5,
    backUrl: "dashboard",
  },
  [StepKind.mintNFT]: {
    path: "mintNFT",
    kind: StepKind.mintNFT,
    title: "Mint NFT",
    description: "Mint your domain NFT",
    index: 6,
    backUrl: "sendEmail",
  },
  [StepKind.collectEmail]: {
    path: "collectEmail",
    kind: StepKind.collectEmail,
    title: "Collect Email",
    description: "Verify your email to continue",
    index: 7,
    backUrl: "sendEmail",
  },
};
