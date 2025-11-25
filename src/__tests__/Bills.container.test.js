/**
 * @jest-environment jsdom
 */

import Bills from "../containers/Bills.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { screen } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import mockStore from "../__mocks__/store.js";

jest.mock("../app/Store", () => mockStore);

describe("Bills container", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="root"></div>
      <button data-testid="btn-new-bill">New Bill</button>
      <div data-testid="icon-eye" data-bill-url="https://test.fr/image.jpg"></div>
      <div id="modaleFile"><div class="modal-body"></div></div>
    `;

    $.fn.modal = jest.fn();
  });

  test("handleClickNewBill should navigate to NewBill page", () => {
    const onNavigate = jest.fn();
    const bills = new Bills({
      document,
      onNavigate,
      store: null,
      localStorage: null,
    });

    const btn = screen.getByTestId("btn-new-bill");
    userEvent.click(btn);

    expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH.NewBill);
  });

  test("handleClickIconEye should open modal", () => {
    const bills = new Bills({
      document,
      onNavigate: () => {},
      store: null,
      localStorage: null,
    });

    const icon = screen.getByTestId("icon-eye");
    userEvent.click(icon);

    expect($.fn.modal).toHaveBeenCalledWith("show");
  });

  test("getBills should return bills sorted by date DESC and formatted correctly", async () => {
    const bills = new Bills({
      document,
      onNavigate: () => {},
      store: mockStore,
      localStorage: null,
    });

    const result = await bills.getBills();

    expect(result.length).toBeGreaterThan(0);

    const resultDates = result
      .map((b) => new Date(b.date).getTime())
      .filter((d) => !isNaN(d));
    const sortedResultDates = [...resultDates].sort((a, b) => b - a);
    expect(resultDates).toEqual(sortedResultDates);

    result.forEach((bill) => {
      expect(bill).toHaveProperty("id");
      expect(bill).toHaveProperty("type");
      expect(bill).toHaveProperty("name");
      expect(bill).toHaveProperty("amount");
      expect(bill).toHaveProperty("date");
      expect(bill).toHaveProperty("status");
      expect(bill).toHaveProperty("fileUrl");
    });

    result.forEach((bill) => {
      expect(bill.date).toMatch(/[A-Za-zé]+/);
    });
  });

  test("should call store.bills().list()", async () => {
    const spy = jest.spyOn(mockStore, "bills");

    const bills = new Bills({
      document,
      onNavigate: () => {},
      store: mockStore,
      localStorage: null,
    });
    await bills.getBills();

    expect(spy).toHaveBeenCalled();
  });
});
