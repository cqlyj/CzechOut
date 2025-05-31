// Layout.js
import { Outlet } from "react-router";
import { Modal } from "./Modal";
import { ConnectWallet } from "../../pages/connectWallet";

export const Layout = () => {
  return (
      <Modal>
        <Outlet />
      </Modal>
  );
};
