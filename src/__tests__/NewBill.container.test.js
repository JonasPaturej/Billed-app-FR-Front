import { screen, fireEvent, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import NewBill from "../containers/NewBill.js";
import mockStore from "../__mocks__/store";
import { ROUTES_PATH } from "../constants/routes";
import router from "../app/Router.js";
import "@testing-library/jest-dom";

jest.mock("../app/store", () => mockStore);

const useRealRouterOnNewBill = async () => {
  // 1) root + router
  document.body.innerHTML = `<div id="root"></div>`;
  router();

  // 2) simulate logged-in employee
  window.localStorage.setItem(
    "user",
    JSON.stringify({ type: "Employee", email: "a@a" })
  );

  // 3) navigate via router (injects layout + icons + page)
  window.onNavigate(ROUTES_PATH.NewBill);

  await screen.findByTestId("form-new-bill");

  // (sanity) ensure icons exist to avoid classList null
  if (!document.querySelector('[data-testid="icon-mail"]')) {
    const aside = document.createElement("aside");
    aside.innerHTML = `
      <div data-testid="icon-mail"></div>
      <div data-testid="icon-window"></div>
    `;
    document.body.appendChild(aside);
  }

  // 4) instantiate container using the real onNavigate
  const newBill = new NewBill({
    document,
    onNavigate: window.onNavigate,
    store: mockStore,
    localStorage: window.localStorage,
  });

  return { newBill };
};

describe("NewBill (container)", () => {
  test("accepte un fichier .png et ne montre pas d’erreur", async () => {
    await useRealRouterOnNewBill();

    const fileInput = await screen.findByTestId("file");
    const good = new File(["img"], "ok.png", { type: "image/png" });
    await userEvent.upload(fileInput, good);

    const err = screen.queryByTestId("file-error");
    if (err) expect(err).not.toBeVisible();
  });

  test("refuse un fichier .pdf, affiche un message et reset l’input", async () => {
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

  test("submit complet fait un POST + UPDATE et redirige vers Bills", async () => {
    await useRealRouterOnNewBill();

    const createMock = jest.fn(() =>
      Promise.resolve({ fileUrl: "https://test", key: "123" })
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
    expect(screen.getByText(/Mes notes de frais/i)).toBeInTheDocument();
  });

  test("affiche une erreur 404 si l’API create renvoie 404", async () => {
    await useRealRouterOnNewBill();
    window.onNavigate(ROUTES_PATH.NewBill);
    await screen.findByTestId("form-new-bill");

    jest.spyOn(mockStore, "bills").mockImplementation(() => ({
      create: () => Promise.reject({ status: 404 }),
      update: () => Promise.resolve({}),
      list: () => Promise.resolve([]),
    }));

    const fileInput = await screen.findByTestId("file");
    const file = new File(["img"], "x.png", { type: "image/png" });
    await userEvent.upload(fileInput, file);

    // l’erreur s’affiche suite à l’upload (create rejeté)
    const err = await screen.findByTestId("file-error");
    expect(err).toBeVisible();

    // submit ne doit pas nous rediriger (fileValid = false)
    const form = await screen.findByTestId("form-new-bill");
    fireEvent.submit(form);

    // on confirme qu’on n'est pas sur Bills
    expect(screen.queryByText(/Mes notes de frais/i)).toBeNull();
  });

  test("affiche une erreur 500 si l’API create renvoie 500", async () => {
    await useRealRouterOnNewBill();
    window.onNavigate(ROUTES_PATH.NewBill);
    await screen.findByTestId("form-new-bill");

    jest.spyOn(mockStore, "bills").mockImplementation(() => ({
      create: () => Promise.reject({ status: 500 }),
      update: () => Promise.resolve({}),
      list: () => Promise.resolve([]),
    }));

    const fileInput = await screen.findByTestId("file");
    const file = new File(["img"], "y.png", { type: "image/png" });
    await userEvent.upload(fileInput, file);

    const err = await screen.findByTestId("file-error");
    expect(err).toBeVisible();

    const form = await screen.findByTestId("form-new-bill");
    fireEvent.submit(form);

    expect(screen.queryByText(/Mes notes de frais/i)).toBeNull();
  });
});
