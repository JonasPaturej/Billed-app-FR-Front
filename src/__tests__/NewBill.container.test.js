/**
 * @jest-environment jsdom
 */
import { screen, fireEvent, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import mockStore from "../__mocks__/store";
import { ROUTES_PATH } from "../constants/routes";
import router from "../app/Router.js";
import "@testing-library/jest-dom";

jest.mock("../app/Store", () => mockStore);

const useRealRouterOnNewBill = async () => {
  document.body.innerHTML = `<div id="root"></div>`;

  window.localStorage.setItem(
    "user",
    JSON.stringify({ type: "Employee", email: "employee@test.tld" })
  );

  router();

  // On va d'abord sur Bills
  window.onNavigate(ROUTES_PATH.Bills);

  // On clique sur "Nouvelle note de frais"
  const btnNewBill = await screen.findByTestId("btn-new-bill");
  fireEvent.click(btnNewBill);

  // On attend que le formulaire NewBill soit affiché
  await screen.findByTestId("form-new-bill");

  // Sécurité pour les icônes (certaines implémentations les attendent)
  if (!document.querySelector('[data-testid="icon-mail"]')) {
    const aside = document.createElement("aside");
    aside.innerHTML = `
      <div data-testid="icon-mail"></div>
      <div data-testid="icon-window"></div>
    `;
    document.body.appendChild(aside);
  }
};

describe("NewBill (container)", () => {
  it("should accept a png file and doesnt' display an error message", async () => {
    await useRealRouterOnNewBill();

    const fileInput = await screen.findByTestId("file");
    const good = new File(["img"], "ok.png", { type: "image/png" });
    await userEvent.upload(fileInput, good);

    const err = screen.queryByTestId("file-error");
    if (err) expect(err).not.toBeVisible();
  });

  it("should refuse a pdf file, display a message and reset the input", async () => {
    await useRealRouterOnNewBill();

    const fileInput = await screen.findByTestId("file");
    const bad = new File(["%PDF-1.4"], "bad.pdf", { type: "application/pdf" });
    await userEvent.upload(fileInput, bad);

    const error = await screen.findByTestId("file-error");
    expect(error).toBeVisible();
    expect(error.textContent.toLowerCase()).toMatch(
      /format de fichier non supporté/i
    );
    expect(fileInput.value).toBe("");
  });

  it("should submit, do an UPDATE and redirect to Bills", async () => {
    await useRealRouterOnNewBill();

    const createMock = jest.fn(() =>
      Promise.resolve({
        fileUrl: "https://test",
        key: "123",
        id: "123",
      })
    );
    const updateMock = jest.fn(() => Promise.resolve({}));
    const listMock = jest.fn(() => Promise.resolve([]));

    jest.spyOn(mockStore, "bills").mockImplementation(() => ({
      create: createMock,
      update: updateMock,
      list: listMock,
    }));

    userEvent.selectOptions(screen.getByTestId("expense-type"), "Transports");
    userEvent.type(screen.getByTestId("expense-name"), "Taxi");
    userEvent.type(screen.getByTestId("amount"), "42");
    userEvent.type(screen.getByTestId("datepicker"), "2023-01-01");
    userEvent.type(screen.getByTestId("vat"), "20");
    userEvent.type(screen.getByTestId("pct"), "10");
    userEvent.type(screen.getByTestId("commentary"), "Course aéroport");

    const file = new File(["img"], "justif.jpg", { type: "image/jpeg" });
    await userEvent.upload(screen.getByTestId("file"), file);

    const form = await screen.findByTestId("form-new-bill");
    fireEvent.submit(form);

    await waitFor(() => expect(createMock).toHaveBeenCalled());
    await waitFor(() => expect(updateMock).toHaveBeenCalled());
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getByText(/Mes notes de frais/i)).toBeInTheDocument()
    );
  });

  it("should display an error 404 if the create API send back 404", async () => {
    await useRealRouterOnNewBill();

    const createMock = jest.fn(() => Promise.reject({ status: 404 }));

    jest.spyOn(mockStore, "bills").mockImplementation(() => ({
      create: createMock,
      update: jest.fn(() => Promise.resolve({})),
      list: jest.fn(() => Promise.resolve([])),
    }));

    userEvent.selectOptions(screen.getByTestId("expense-type"), "Transports");
    userEvent.type(screen.getByTestId("expense-name"), "Taxi");
    userEvent.type(screen.getByTestId("amount"), "42");
    userEvent.type(screen.getByTestId("datepicker"), "2023-01-01");
    userEvent.type(screen.getByTestId("vat"), "20");
    userEvent.type(screen.getByTestId("pct"), "10");
    userEvent.type(screen.getByTestId("commentary"), "Erreur 404 test");

    const file = new File(["img"], "ok.jpg", { type: "image/jpeg" });
    await userEvent.upload(screen.getByTestId("file"), file);

    const form = await screen.findByTestId("form-new-bill");
    fireEvent.submit(form);

    const err = await screen.findByTestId("file-error");
    expect(err).toBeVisible();
    expect(err.textContent.toLowerCase()).toMatch(
      /erreur 404 : impossible de sauvegarder/i
    );
  });

  it("should display an error 500 if the create API send back 500", async () => {
    await useRealRouterOnNewBill();

    const createMock = jest.fn(() => Promise.reject({ status: 500 }));

    jest.spyOn(mockStore, "bills").mockImplementation(() => ({
      create: createMock,
      update: jest.fn(() => Promise.resolve({})),
      list: jest.fn(() => Promise.resolve([])),
    }));

    userEvent.selectOptions(screen.getByTestId("expense-type"), "Transports");
    userEvent.type(screen.getByTestId("expense-name"), "Taxi");
    userEvent.type(screen.getByTestId("amount"), "42");
    userEvent.type(screen.getByTestId("datepicker"), "2023-01-01");
    userEvent.type(screen.getByTestId("vat"), "20");
    userEvent.type(screen.getByTestId("pct"), "10");
    userEvent.type(screen.getByTestId("commentary"), "Erreur 500 test");

    const file = new File(["img"], "ok.jpg", { type: "image/jpeg" });
    await userEvent.upload(screen.getByTestId("file"), file);

    const form = await screen.findByTestId("form-new-bill");
    fireEvent.submit(form);

    const err = await screen.findByTestId("file-error");
    expect(err).toBeVisible();
    expect(err.textContent.toLowerCase()).toMatch(
      /erreur 500 : erreur serveur/i
    );
  });
});
