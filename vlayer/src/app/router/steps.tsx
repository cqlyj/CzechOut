import {
  WelcomePage,
  ConnectWallet,
  SendEmailContainer,
  CollectEmailContainer,
  MintNFTContainer,
  SuccessContainer,
  RegisterContainer,
  Update7702Page,
} from "../../pages";
import React from "react";
import { StepKind, stepsMeta, StepMeta } from "./types";
import { DashboardContainer } from "../../pages/dashboard";

// Define a component mapping type
export type StepComponentMap = Record<StepKind, React.ComponentType>;

// Map step kinds to their respective components
export const stepComponents: StepComponentMap = {
  [StepKind.welcome]: WelcomePage,
  [StepKind.register]: RegisterContainer,
  [StepKind.dashboard]: DashboardContainer,
  [StepKind.accountSetup]: Update7702Page,  
  [StepKind.success]: SuccessContainer,
  [StepKind.sendEmail]: SendEmailContainer,
  [StepKind.mintNFT]: MintNFTContainer,
  [StepKind.collectEmail]: CollectEmailContainer,
};

// Create a complete step structure that combines metadata with components
export type Step = StepMeta & {
  component: React.ComponentType;
};

// Get complete step data with component
export const getStep = (kind: StepKind): Step => {
  const meta = stepsMeta[kind];
  if (!meta) {
    throw new StepNotFoundError(kind);
  }

  return {
    ...meta,
    kind,
    component: stepComponents[kind],
  };
};

// Get all steps as an array when needed
export const getAllSteps = (): Step[] => {
  return Object.entries(stepsMeta).map(([kindStr, meta]) => {
    const kind = Number(kindStr) as StepKind;
    return {
      ...meta,
      kind,
      component: stepComponents[kind],
    };
  });
};

export class StepNotFoundError extends Error {
  constructor(kind: StepKind) {
    super(`Step with kind ${kind} not found`);
    this.name = "StepNotFoundError";
  }
}

export const getStepPath = (kind: StepKind): string => {
  const meta = stepsMeta[kind];
  if (!meta) {
    throw new StepNotFoundError(kind);
  }
  return meta.path;
};
