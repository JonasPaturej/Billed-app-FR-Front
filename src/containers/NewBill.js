import { ROUTES_PATH } from "../constants/routes.js";
import Logout from "./Logout.js";

export default class NewBill {
  constructor({ document, onNavigate, store, localStorage }) {
    this.document = document;
    this.onNavigate = onNavigate;
    this.store = store;

    const formNewBill = this.document.querySelector(
      `form[data-testid="form-new-bill"]`
    );
    if (formNewBill) formNewBill.addEventListener("submit", this.handleSubmit);

    const file = this.document.querySelector(`input[data-testid="file"]`);
    if (file) file.addEventListener("change", this.handleChangeFile);

    this.fileUrl = null;
    this.fileName = null;
    this.billId = null;
    this.fileValid = false;

    new Logout({ document, localStorage, onNavigate });
  }

  showFileError(message) {
    // Crée ou met à jour le message d’erreur lié au fichier
    let el = this.document.querySelector('[data-testid="file-error"]');
    if (!el) {
      el = this.document.createElement("p");
      el.setAttribute("data-testid", "file-error");
      el.style.color = "red";
      el.style.marginTop = "4px";
      const fileInput = this.document.querySelector(
        `input[data-testid="file"]`
      );
      fileInput?.parentNode?.appendChild(el);
    }
    el.textContent = message || "";
    el.style.display = message ? "block" : "none";
  }

  handleChangeFile = async (e) => {
    e.preventDefault();
    const input = this.document.querySelector(`input[data-testid="file"]`);
    const file = input?.files?.[0];

    if (!file) {
      this.fileValid = false;
      this.showFileError("");
      return;
    }

    // Validation par nom ou type
    const nameOk = /\.(png|jpe?g)$/i.test(file.name || "");
    const typeOk = file.type
      ? ["image/png", "image/jpeg", "image/jpg"].includes(file.type)
      : false;

    if (!(nameOk || typeOk)) {
      this.fileValid = false;
      this.fileUrl = null;
      this.fileName = null;
      if (input) input.value = "";
      this.showFileError("Format non supporté (.png, .jpg, .jpeg uniquement).");
      return;
    }

    this.showFileError("");
    this.fileValid = true;

    const fileName = file.name;
    const formData = new FormData();
    const email = JSON.parse(localStorage.getItem("user")).email;
    formData.append("file", file);
    formData.append("email", email);

    try {
      if (this.store?.bills) {
        const res = await this.store.bills().create({
          data: formData,
          headers: { noContentType: true },
        });

        console.log("create response", res);

        const rawPath = res?.filePath ?? res?.data?.filePath ?? null;
        const normalizedPath = rawPath ? rawPath.replace(/\\/g, "/") : null;
        const backendOrigin = "http://localhost:5678";
        const fileUrl = normalizedPath
          ? `${backendOrigin}/${normalizedPath}`
          : null;
        const id = res?.id ?? res?.data?.id ?? null;

        this.billId = id;
        this.fileUrl = fileUrl;
        this.fileName = file.name;

        if (!this.billId || !this.fileUrl) {
          this.fileValid = false;
          this.showFileError("Erreur lors de l’envoi du fichier.");
        }
      }
    } catch (error) {
      this.fileValid = false;
      this.showFileError("Impossible d'uploader le fichier.");
      // console.error(error)
    }
  };

  handleSubmit = (e) => {
    e.preventDefault();

    const fileInput = this.document.querySelector(`input[data-testid="file"]`);
    const file = fileInput?.files?.[0] || null;

    const nameOk = file ? /\.(png|jpe?g)$/i.test(file.name) : false;
    const typeOk = file
      ? ["image/png", "image/jpeg", "image/jpg"].includes(file.type)
      : false;
    const okByExtension = nameOk || typeOk;

    const needsUpload = !!this.store?.bills;
    const uploadReady = this.fileValid && !!this.billId && !!this.fileUrl;

    if (!okByExtension) {
      this.showFileError(
        "Veuillez sélectionner une image valide (.png, .jpg ou .jpeg)."
      );
      if (fileInput) fileInput.value = "";
      return;
    }
    if (needsUpload && !uploadReady) {
      this.showFileError("Erreur lors de l’envoi du fichier.");
      return;
    }

    const email = JSON.parse(localStorage.getItem("user")).email;
    const bill = {
      email,
      type: e.target.querySelector(`select[data-testid="expense-type"]`).value,
      name: e.target.querySelector(`input[data-testid="expense-name"]`).value,
      amount: parseInt(
        e.target.querySelector(`input[data-testid="amount"]`).value
      ),
      date: e.target.querySelector(`input[data-testid="datepicker"]`).value,
      vat: e.target.querySelector(`input[data-testid="vat"]`).value,
      pct:
        parseInt(e.target.querySelector(`input[data-testid="pct"]`).value) ||
        20,
      commentary: e.target.querySelector(`textarea[data-testid="commentary"]`)
        .value,
      fileUrl: this.fileUrl,
      fileName: this.fileName,
      status: "pending",
      id: this.billId,
    };

    return this.updateBill(bill);
  };

  // Met à jour la note de frais
  updateBill = async (bill) => {
    try {
      const selector = String(this.billId ?? bill.id);
      const jwt = localStorage.getItem("jwt");

      const payload = {
        ...bill,
        id: Number.isNaN(Number(selector)) ? selector : Number(selector),
      };

      const res = await fetch(`http://localhost:5678/bills/${selector}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.log("[UPDATE BILL] status:", res.status);
        console.log("[UPDATE BILL] response:", text);
        throw new Error(`Erreur serveur (${res.status})`);
      }

      if (res.status !== 204) {
        try {
          await res.json();
        } catch (_) {}
      }

      this.onNavigate(ROUTES_PATH["Bills"]);
    } catch (error) {
      this.showFileError("Impossible de sauvegarder la note de frais.");
      //console.error(error)
    }
    return null;
  };
}
