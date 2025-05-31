import { BrowserRouter, Routes, Route } from "react-router";
import { ErrorBoundary } from "react-error-boundary";
import { AppErrorBoundaryComponent } from "../../shared/errors/ErrorBoundary";
import { Layout } from "../../shared/layout/Layout";
import { getAllSteps } from "./steps";
import { DashboardContainer } from "../../pages/dashboard";

const Router = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary FallbackComponent={AppErrorBoundaryComponent}>
        <Routes>
          {/* Dashboard route without modal wrapper */}
          <Route path="/dashboard" element={<DashboardContainer />} />

          {/* All other routes with modal wrapper */}
          <Route path="/" element={<Layout />}>
            {getAllSteps()
              .filter((step) => step.path !== "dashboard") // Exclude dashboard from modal layosut
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
