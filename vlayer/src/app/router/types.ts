export enum StepKind {
  welcome,
  register,
  update7702,
  dashboard,
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
    description: 'No wait and just chezhout',
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
  [StepKind.update7702]: {
    path: "update7702",
    kind: StepKind.update7702,
    title: "Upgrade 7702",
    description: "",
    index: 2,
  },
  [StepKind.success]: {
    path: "success",
    kind: StepKind.success,
    title: "Success 🎉",
    description: "Your account is now a 7702 smart account<br />Try sending transactions with face recognition and pin",
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
};
