import { ROUTES_PATH } from "../constants/routes.js";
import Logout from "./Logout.js";

export default class NewBill {
  constructor({ document, onNavigate, store, localStorage }) {
    this.document = document;
    this.onNavigate = onNavigate;
    this.store = store;

    this.fileUrl = null;
    this.fileName = null;
    this.billId = null;
    this.pendingFile = null;

    const formNewBill = this.document.querySelector(
      `form[data-testid="form-new-bill"]`
    );
    if (formNewBill) {
      formNewBill.addEventListener("submit", this.handleSubmit);
    }

    const file = this.document.querySelector(`input[data-testid="file"]`);
    if (file) file.addEventListener("change", this.handleChangeFile);

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

  // Vérification du formulaire et du format que l'on envoie
  handleChangeFile = (e) => {
    e.preventDefault();

    const input = this.document.querySelector(`input[data-testid="file"]`);
    const file = input?.files?.[0];

    if (!file) {
      this.pendingFile = null;
      this.fileName = null;
      this.showFileError("");
      return;
    }

    const nameOk = /\.(png|jpe?g)$/i.test(file.name || "");
    const typeOk = file.type
      ? ["image/png", "image/jpeg", "image/jpg"].includes(file.type)
      : false;

    if (!(nameOk || typeOk)) {
      this.pendingFile = null;
      this.fileName = null;
      if (input) input.value = "";
      this.showFileError("Format de fichier non supporté");
      return;
    }

    this.showFileError("");
    this.pendingFile = file;
    this.fileName = file.name;
  };

  // Envoi du formulaire
  handleSubmit = async (e) => {
    e.preventDefault();

    const fileInput = this.document.querySelector(`input[data-testid="file"]`);
    const file = this.pendingFile || fileInput?.files?.[0] || null;

    let uploadedFileUrl = this.fileUrl;
    let uploadedBillId = this.billId;

    if (!uploadedFileUrl || !uploadedBillId) {
      if (!file) {
        this.showFileError(
          "Veuillez sélectionner une image valide (.png, .jpg ou .jpeg)."
        );
        return;
      }

      const nameOk = /\.(png|jpe?g)$/i.test(file.name);
      const typeOk = ["image/png", "image/jpeg", "image/jpg"].includes(
        file.type
      );
      const okByExtension = nameOk || typeOk;

      if (!okByExtension) {
        this.showFileError(
          "Veuillez sélectionner une image valide (.png, .jpg ou .jpeg)."
        );
        if (fileInput) fileInput.value = "";
        return;
      }

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

          this.fileUrl = uploadedFileUrl;
          this.billId = uploadedBillId;
          this.fileName = this.fileName || file.name;

          if (!uploadedFileUrl || !uploadedBillId) {
            this.showFileError("Erreur lors de l’envoi du fichier.");
            return;
          }
        } catch (_) {
          this.showFileError("Impossible d'uploader le fichier.");
          return;
        }
      }
    }

    if (!uploadedFileUrl || !uploadedBillId) {
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
        .update({ data: JSON.stringify(bill), selector: bill.id })
        .then(() => {
          this.onNavigate(ROUTES_PATH["Bills"]);
        })
        .catch(() => {
          this.showFileError("Impossible de sauvegarder la note de frais.");
        });
    }
    return null;
  };
}
