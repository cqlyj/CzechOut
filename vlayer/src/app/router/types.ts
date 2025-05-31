export enum StepKind {
  welcome,
  register,
  dashboard,
  connectWallet,
  sendEmail,
  collectEmail,
  mintNft,
  success,
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
    description:
      'No wait and just chezhout',
    // headerIcon: "/img/email-welcome-img.svg",
    index: 0,
  },
  [StepKind.register]: {
    path: "register",
    kind: StepKind.register,
    title: "Register",
    description: "",
    // description: "Please register with your email and PIN",
    index: 1,
    backUrl: "",
  },
  [StepKind.dashboard]: {
    path: "dashboard",
    kind: StepKind.dashboard,
    title: "Dashboard",
    description: "",
    index: 2,
    backUrl: "register",
  },
  [StepKind.connectWallet]: {
    path: "connect-wallet",
    kind: StepKind.connectWallet,
    title: "Mail based NFT",
    description:
      "To proceed to the next step, please connect your wallet now by clicking the button below.",
    backUrl: "register",
    index: 3,
  },
  [StepKind.sendEmail]: {
    path: "send-email",
    kind: StepKind.sendEmail,
    title: "Send Email",
    description:
      "Please copy the details provided below and use them to send the email.",
    backUrl: "connect-wallet",
    index: 4,
  },
  [StepKind.collectEmail]: {
    path: "collect-email",
    kind: StepKind.collectEmail,
    title: "Waiting...",
    description:
      "Our mailbox is processing your email. Please wait a few seconds.",
    backUrl: "send-email",
    index: 5,
  },
  [StepKind.mintNft]: {
    path: "mint-nft",
    kind: StepKind.mintNft,
    title: "Mint NFT",
    description: "Your email is ready for proving and minting.",
    backUrl: "send-email",
    index: 6,
  },
  [StepKind.success]: {
    path: "success",
    kind: StepKind.success,
    title: "Success",
    description: "",
    headerIcon: "/img/success-icon.svg",
    index: 7,
  },
};
