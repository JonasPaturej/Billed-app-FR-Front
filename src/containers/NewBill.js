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
    if (formNewBill) {
      formNewBill.addEventListener("reset", this.cleanupDraft);
    }

    const file = this.document.querySelector(`input[data-testid="file"]`);
    if (file) file.addEventListener("change", this.handleChangeFile);

    this.fileUrl = null;
    this.fileName = null;
    this.billId = null;
    this.fileValid = false;
    this.pendingFile = null;

    new Logout({ document, localStorage, onNavigate });
  }

  // Crée ou met à jour le message d’erreur lié au fichier
  showFileError(message) {
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

  handleChangeFile = (e) => {
    e.preventDefault();
    const input = this.document.querySelector(`input[data-testid="file"]`);
    const file = input?.files?.[0];

    if (!file) {
      this.fileValid = false;
      this.pendingFile = null;
      this.fileName = null;
      this.showFileError("");
      return;
    }

    // Vérification du format
    const nameOk = /\.(png|jpe?g)$/i.test(file.name || "");
    const typeOk = file.type
      ? ["image/png", "image/jpeg", "image/jpg"].includes(file.type)
      : false;

    if (!(nameOk || typeOk)) {
      this.fileValid = false;
      this.pendingFile = null;
      this.fileName = null;
      if (input) input.value = "";
      this.showFileError("Format de fichier non supporté");
      return;
    }

    this.showFileError("");
    this.fileValid = true;
    this.pendingFile = file;
    this.fileName = file.name;
  };

  handleSubmit = async (e) => {
    e.preventDefault();

    const fileInput = this.document.querySelector(`input[data-testid="file"]`);
    const file = this.pendingFile || fileInput?.files?.[0] || null;

    const nameOk = file ? /\.(png|jpe?g)$/i.test(file.name) : false;
    const typeOk = file
      ? ["image/png", "image/jpeg", "image/jpg"].includes(file.type)
      : false;

    if (!nameOk && !typeOk) {
      this.showFileError(
        "Veuillez sélectionner une image valide (.png, .jpg ou .jpeg)."
      );
      if (fileInput) fileInput.value = "";
      return;
    }

    let uploadedFileUrl = null;
    let uploadedBillId = null;

    if (this.store?.bills) {
      const formData = new FormData();
      const email = JSON.parse(localStorage.getItem("user")).email;
      formData.append("file", file);
      formData.append("email", email);

      try {
        const res = await this.store.bills().create({
          data: formData,
          headers: { noContentType: true },
        });

        const rawPath = res?.filePath ?? res?.data?.filePath ?? null;
        const normalizedPath = rawPath ? rawPath.replace(/\\/g, "/") : null;
        const backendOrigin = "http://localhost:5678";

        uploadedFileUrl =
          res?.fileUrl ??
          res?.data?.fileUrl ??
          (normalizedPath ? `${backendOrigin}/${normalizedPath}` : null);

        uploadedBillId =
          res?.key ?? res?.data?.key ?? res?.id ?? res?.data?.id ?? null;

        if (!uploadedFileUrl || !uploadedBillId) {
          this.showFileError("Erreur lors de l’envoi du fichier.");
          return;
        }
      } catch (_) {
        if (error.message.includes("404")) {
          this.showFileError("Erreur 404 : Ressource non trouvée.");
        } else if (error.message.includes("500")) {
          this.showFileError("Erreur 500 : Erreur Serveur.");
        } else {
          this.showFileError("Impossible d'uploader le fichier.");
        }
        return;
      }
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
      fileUrl: uploadedFileUrl,
      fileName: this.fileName,
      status: "pending",
      id: uploadedBillId,
    };

    return this.updateBill(bill);
  };

  // Met à jour la note de frais
  updateBill = (bill) => {
    if (this.store?.bills) {
      return this.store
        .bills()
        .update({ data: JSON.stringify(bill), selector: this.billId })
        .then(() => {
          this.onNavigate(ROUTES_PATH["Bills"]);
        })
        .catch((error) => {
          if (error.message.includes("404")) {
            this.showFileError("Erreur 404 : impossible de sauvegarder.");
          } else if (error.message.includes("500")) {
            this.showFileError("Erreur 500 : problème serveur.");
          } else {
            this.showFileError("Impossible de sauvegarder la note de frais.");
          }
        });
    }
    return null;
  };
}
