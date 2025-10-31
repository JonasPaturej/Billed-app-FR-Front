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
    // Crée/affiche un message d’erreur non intrusif pour les tests et l’UX
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

    // ✅ validation type de fichier
    const allowed = ["image/png", "image/jpeg", "image/jpg"];
    if (!allowed.includes(file.type)) {
      this.fileValid = false;
      this.fileUrl = null;
      this.fileName = null;
      if (input) input.value = ""; // reset input
      this.showFileError(
        "Format de fichier non supporté. Utilisez .png, .jpg ou .jpeg."
      );
      return;
    }

    // OK fichier image → on masque l’erreur
    this.showFileError("");
    this.fileValid = true;

    const filePath = e.target.value.split(/\\/g);
    const fileName = filePath[filePath.length - 1];
    const formData = new FormData();
    const email = JSON.parse(localStorage.getItem("user")).email;
    formData.append("file", file);
    formData.append("email", email);

    try {
      if (this.store?.bills) {
        const { fileUrl, key } = await this.store.bills().create({
          data: formData,
          headers: {
            noContentType: true,
          },
        });
        this.billId = key;
        this.fileUrl = fileUrl;
        this.fileName = fileName;
      }
    } catch (error) {
      // En cas d’erreur API upload, on invalide le fichier et on affiche un message générique
      this.fileValid = false;
      this.showFileError("Impossible d'uploader le fichier. Réessayez.");
      // console.error(error)
    }
  };

  handleSubmit = (e) => {
    e.preventDefault();

    // Garde : pas de submit si fichier invalide
    if (!this.fileValid || !this.fileUrl) {
      this.showFileError(
        "Veuillez sélectionner une image valide (.png/.jpg/.jpeg)."
      );
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
    };

    this.updateBill(bill);
    this.onNavigate(ROUTES_PATH["Bills"]);
  };

  // not need to cover this function by tests
  updateBill = (bill) => {
    if (this.store?.bills) {
      return this.store
        .bills()
        .update({ data: JSON.stringify(bill), selector: this.billId })
        .then(() => {
          this.onNavigate(ROUTES_PATH["Bills"]);
        })
        .catch((error) => {
          // console.error(error)
        });
    }
    return null;
  };
}
