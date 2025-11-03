import { screen, fireEvent, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import NewBill from "../containers/NewBill.js";
import mockStore from "../__mocks__/store";
import { ROUTES_PATH } from "../constants/routes";
import router from "../app/Router.js";
import "@testing-library/jest-dom";

jest.mock("../app/Store", () => mockStore);

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
    const { newBill } = await useRealRouterOnNewBill();

    newBill.fileValid = true;
    newBill.fileUrl = "https://test";
    newBill.fileName = "justif.jpg";
    newBill.billId = "123";

    const createMock = jest.fn();
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

    const form = await screen.findByTestId("form-new-bill");
    fireEvent.submit(form);

    await waitFor(() => expect(updateMock).toHaveBeenCalled());
    await waitFor(() => expect(listMock).toHaveBeenCalled());
    expect(screen.getByText(/Mes notes de frais/i)).toBeInTheDocument();

    expect(createMock).not.toHaveBeenCalled();
  });

  it("should display an error 404 if the create API send back 404", async () => {
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

  test("should display an error 500 if the create API send back 500", async () => {
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
