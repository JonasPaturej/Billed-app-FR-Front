import { formatDate } from "../app/format.js";
import DashboardFormUI from "../views/DashboardFormUI.js";
import BigBilledIcon from "../assets/svg/big_billed.js";
import { ROUTES_PATH } from "../constants/routes.js";
import USERS_TEST from "../constants/usersTest.js";
import Logout from "./Logout.js";

export const filteredBills = (data, status) => {
  return data && data.length
    ? data.filter((bill) => {
        let selectCondition;

        // in jest environment
        if (typeof jest !== "undefined") {
          selectCondition = bill.status === status;
        } else {
          /* istanbul ignore next */
          // in prod environment
          const userEmail = JSON.parse(localStorage.getItem("user")).email;
          selectCondition =
            bill.status === status &&
            ![...USERS_TEST, userEmail].includes(bill.email);
        }

        return selectCondition;
      })
    : [];
};

export const card = (bill) => {
  const firstAndLastNames = bill.email.split("@")[0];
  const firstName = firstAndLastNames.includes(".")
    ? firstAndLastNames.split(".")[0]
    : "";
  const lastName = firstAndLastNames.includes(".")
    ? firstAndLastNames.split(".")[1]
    : firstAndLastNames;

  return `
    <div class='bill-card' id='open-bill${bill.id}' data-testid='open-bill${
    bill.id
  }'>
      <div class='bill-card-name-container'>
        <div class='bill-card-name'> ${firstName} ${lastName} </div>
        <span class='bill-card-grey'> ... </span>
      </div>
      <div class='name-price-container'>
        <span> ${bill.name} </span>
        <span> ${bill.amount} € </span>
      </div>
      <div class='date-type-container'>
        <span> ${formatDate(bill.date)} </span>
        <span> ${bill.type} </span>
      </div>
    </div>
  `;
};

export const cards = (bills) => {
  return bills && bills.length ? bills.map((bill) => card(bill)).join("") : "";
};

export const getStatus = (index) => {
  switch (index) {
    case 1:
      return "pending";
    case 2:
      return "accepted";
    case 3:
      return "refused";
  }
};

export default class {
  constructor({ document, onNavigate, store, bills, localStorage }) {
    this.document = document;
    this.onNavigate = onNavigate;
    this.store = store;

    this.open = { 1: false, 2: false, 3: false };
    this.selectedId = { 1: null, 2: null, 3: null };

    $("#arrow-icon1").click((e) => this.handleShowTickets(e, bills, 1));
    $("#arrow-icon2").click((e) => this.handleShowTickets(e, bills, 2));
    $("#arrow-icon3").click((e) => this.handleShowTickets(e, bills, 3));
    new Logout({ localStorage, onNavigate });
  }

  handleClickIconEye = () => {
    const billUrl = $("#icon-eye-d").attr("data-bill-url");
    const $modal = $("#modaleFileAdmin1");
    const imgWidth = Math.floor($modal.width() * 0.8);
    const $body = $modal.find(".modal-body");

    if (billUrl) {
      $body.html(
        `<div style='text-align: center;'><img width=${imgWidth} src="${billUrl}" alt="Bill"/></div>`
      );
    } else {
      $body.html(
        `<div style='text-align:center;color:#888;'>Aucun justificatif disponible.</div>`
      );
    }
    if (typeof $modal.modal === "function") $modal.modal("show");
  };

  handleEditTicket(e, bill, billsOfSection, index) {
    const alreadySelected = this.selectedId[index] === bill.id;
    this.selectedId[index] = alreadySelected ? null : bill.id;

    billsOfSection.forEach((b) => {
      $(`#open-bill${b.id}`).css({ background: "#0D5AE5" });
    });

    if (!alreadySelected) {
      $(`#open-bill${bill.id}`).css({ background: "#2A2B35" });
      $(".dashboard-right-container div").html(DashboardFormUI(bill));
      $(".vertical-navbar").css({ height: "150vh" });
    } else {
      $(".dashboard-right-container div").html(`
        <div id="big-billed-icon" data-testid="big-billed-icon">${BigBilledIcon}</div>
      `);
      $(".vertical-navbar").css({ height: "120vh" });
    }

    $("#icon-eye-d").off("click").on("click", this.handleClickIconEye);
    $("#btn-accept-bill")
      .off("click")
      .on("click", (evt) => this.handleAcceptSubmit(evt, bill));
    $("#btn-refuse-bill")
      .off("click")
      .on("click", (evt) => this.handleRefuseSubmit(evt, bill));
  }

  handleAcceptSubmit = (e, bill) => {
    const newBill = {
      ...bill,
      status: "accepted",
      commentAdmin: $("#commentary2").val(),
    };
    this.updateBill(newBill);
    this.onNavigate(ROUTES_PATH["Dashboard"]);
  };

  handleRefuseSubmit = (e, bill) => {
    const newBill = {
      ...bill,
      status: "refused",
      commentAdmin: $("#commentary2").val(),
    };
    this.updateBill(newBill);
    this.onNavigate(ROUTES_PATH["Dashboard"]);
  };

  handleShowTickets(e, bills, index) {
    this.open[index] = !this.open[index];

    const status = getStatus(index);
    const $arrow = $(`#arrow-icon${index}`);
    const $container = $(`#status-bills-container${index}`);

    if (this.open[index]) {
      $arrow.css({ transform: "rotate(0deg)" });
      const list = cards(filteredBills(bills, status));
      $container.html(list);
    } else {
      $arrow.css({ transform: "rotate(90deg)" });
      $container.html("");
      this.selectedId[index] = null;
      return bills;
    }

    const billsOfSection = filteredBills(bills, status);
    billsOfSection.forEach((bill) => {
      $(`#open-bill${bill.id}`).off("click");
      $(`#open-bill${bill.id}`).on("click", (evt) =>
        this.handleEditTicket(evt, bill, billsOfSection, index)
      );
    });

    return bills;
  }

  getBillsAllUsers = () => {
    if (this.store) {
      return this.store
        .bills()
        .list()
        .then((snapshot) => {
          const bills = snapshot.map((doc) => ({
            id: doc.id,
            ...doc,
            date: doc.date,
            status: doc.status,
          }));
          return bills;
        })
        .catch((error) => {
          throw error;
        });
    }
  };

  // not need to cover this function by tests
  /* istanbul ignore next */
  updateBill = (bill) => {
    if (this.store) {
      return this.store
        .bills()
        .update({ data: JSON.stringify(bill), selector: bill.id })
        .then((bill) => bill)
        .catch(console.log);
    }
  };
}
