import { BrowserRouter, Routes, Route } from "react-router";
import { ErrorBoundary } from "react-error-boundary";
import { AppErrorBoundaryComponent } from "../../shared/errors/ErrorBoundary";
import { Layout } from "../../shared/layout/Layout";
import { getAllSteps } from "./steps";
import { DashboardContainer } from "../../pages/dashboard";
import { WelcomePage } from "../../pages/welcome";
import { RegisterContainer } from "../../pages/register";
import { Update7702Page } from "../../pages/update7702";
import { SuccessContainer } from "../../pages/success";
import { SendMoneyContainer } from "../../pages/sendMoney";

const Router = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary FallbackComponent={AppErrorBoundaryComponent}>
        <Routes>
          {/* Full-screen routes without modal wrapper */}
          <Route path="/dashboard" element={<DashboardContainer />} />
          <Route path="/send" element={<SendMoneyContainer />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/app/register" element={<RegisterContainer />} />
          <Route path="/account-setup" element={<Update7702Page />} />
          <Route path="/success" element={<SuccessContainer />} />
          <Route path="/" element={<WelcomePage />} />

          {/* All other routes with modal wrapper */}
          <Route path="/app" element={<Layout />}>
            {getAllSteps()
              .filter(
                (step) =>
                  step.path !== "dashboard" &&
                  step.path !== "welcome" &&
                  step.path !== "register" &&
                  step.path !== "account-setup" &&
                  step.path !== "success"
              ) // Exclude dashboard, welcome, register, account-setup, and success from modal layout
              .map((step) => (
                <Route
                  key={step.path}
                  path={step.path}
                  element={<step.component />}
                />
              ))}
          </Route>
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Router;
