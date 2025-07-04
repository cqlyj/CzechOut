import React, {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { useCurrentStep } from "../../hooks/useCurentStep";
import { StepKind } from "../../../app/router/types";
import { ProgressBar } from "../ProgressBar";
import { Navigation } from "../Navigation";
import { motionConfig } from "./Modal.animations";
import { ErrorBoundary } from "react-error-boundary";
import { StepErrorBoundaryComponent } from "../../errors/ErrorBoundary";

export const modalContext = createContext({
  showModal: () => {},
  closeModal: () => {},
});

export const Modal = ({ children }: { children: React.ReactNode }) => {
  const modalRef = useRef<HTMLDialogElement>(null);

  const showModal = useCallback(() => {
    modalRef.current?.showModal();
  }, [modalRef]);

  const closeModal = useCallback(() => {
    modalRef.current?.close();
  }, [modalRef]);

  useEffect(() => {
    showModal();
  }, [showModal]);
  const { currentStep } = useCurrentStep();
  const [isWelcome, setIsWelcome] = useState(false);
  const [isSuccessStep, setIsSuccessStep] = useState(false);
  useEffect(() => {
    setIsWelcome(currentStep?.kind === StepKind.welcome);
    setIsSuccessStep(currentStep?.kind === StepKind.success);
  }, [currentStep?.kind]);

  const [descClass, setDescClass] = useState("");
  const [description, setDescription] = useState("");
  useEffect(() => {
    setDescClass("out");

    setTimeout(() => {
      setDescClass("in");
      setDescription(currentStep?.description || "");
    }, 300);
  }, [currentStep?.description]);

  return (
    <dialog className="modal" ref={modalRef}>
      <div className="modal-box bg-white rounded-2xl">
        <motion.div
          className="flex flex-col items-center justify-between"
          {...motionConfig}
        >
          <Navigation />
          <AnimatePresence>
            {!isWelcome && currentStep?.kind !== StepKind.dashboard && <ProgressBar />}
          </AnimatePresence>
          <ErrorBoundary FallbackComponent={StepErrorBoundaryComponent}>
            <AnimatePresence>
              {currentStep?.headerIcon && (
                <motion.img
                  src={currentStep?.headerIcon}
                  alt="Success Icon"
                  className="w-[282px] h-[150px]"
                  {...motionConfig}
                />
              )}
            </AnimatePresence>
            <div className="flex-col flex gap-4 justify-between mb-2">
              {currentStep?.title && (
                <h3 className={`header ${descClass}`}>{currentStep?.title}</h3>
              )}
              {currentStep?.description && (
                <p 
                  className={`h-[116px] desc ${descClass}`}
                  dangerouslySetInnerHTML={{ __html: description }}
                />
              )}
              <modalContext.Provider value={{ showModal, closeModal }}>
                {children}
              </modalContext.Provider>
            </div>
          </ErrorBoundary>
        </motion.div>
      </div>
    </dialog>
  );
};
