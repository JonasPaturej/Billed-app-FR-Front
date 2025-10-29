import { ROUTES_PATH } from "../constants/routes.js";
export let PREVIOUS_LOCATION = "";

// we use a class so as to test its methods in e2e tests
export default class Login {
  constructor({
    document,
    localStorage,
    onNavigate,
    PREVIOUS_LOCATION,
    store,
  }) {
    this.document = document;
    this.localStorage = localStorage;
    this.onNavigate = onNavigate;
    this.PREVIOUS_LOCATION = PREVIOUS_LOCATION;
    this.store = store;

    const formEmployee = this.document.querySelector(
      'form[data-testid="form-employee"]'
    );
    if (formEmployee)
      formEmployee.addEventListener("submit", this.handleSubmitEmployee);

    const formAdmin = this.document.querySelector(
      'form[data-testid="form-admin"]'
    );
    if (formAdmin) formAdmin.addEventListener("submit", this.handleSubmitAdmin);
  }

  handleSubmitEmployee = (e) => {
    e.preventDefault();
    const form = e.target;
    const email =
      form.querySelector('input[data-testid="employee-email-input"]')?.value ||
      "";
    const password =
      form.querySelector('input[data-testid="employee-password-input"]')
        ?.value || "";

    const user = {
      type: "Employee",
      email,
      password,
      status: "connected",
    };

    this.localStorage.setItem("user", JSON.stringify(user));
    this.login(user)
      .catch(() => this.createUser(user))
      .then(() => {
        this.onNavigate(ROUTES_PATH["Bills"]);
        this.PREVIOUS_LOCATION = ROUTES_PATH["Bills"];
        PREVIOUS_LOCATION = this.PREVIOUS_LOCATION;
        this.document.body.style.backgroundColor = "#fff";
      });
  };

  handleSubmitAdmin = (e) => {
    e.preventDefault();
    const form = e.target;
    // Changement input de employee à admin
    const email =
      form.querySelector('input[data-testid="admin-email-input"]')?.value || "";
    const password =
      form.querySelector('input[data-testid="admin-password-input"]')?.value ||
      "";

    const user = {
      type: "Admin",
      email,
      password,
      status: "connected",
    };

    this.localStorage.setItem("user", JSON.stringify(user));
    this.login(user)
      .catch(() => this.createUser(user))
      .then(() => {
        this.onNavigate(ROUTES_PATH["Dashboard"]);
        this.PREVIOUS_LOCATION = ROUTES_PATH["Dashboard"];
        PREVIOUS_LOCATION = this.PREVIOUS_LOCATION;
        document.body.style.backgroundColor = "#fff";
      });
  };

  // not need to cover this function by tests
  login = (user) => {
    if (this.store?.login) {
      return this.store
        .login(
          JSON.stringify({
            email: user.email,
            password: user.password,
          })
        )
        .then(({ jwt }) => {
          localStorage.setItem("jwt", jwt);
        });
    }
    return null;
  };

  // not need to cover this function by tests
  createUser = (user) => {
    if (this.store?.users) {
      return this.store
        .users()
        .create({
          data: JSON.stringify({
            type: user.type,
            name: user.email.split("@")[0],
            email: user.email,
            password: user.password,
          }),
        })
        .then(() => {
          // console.log(`User with ${user.email} is created`)
          return this.login(user);
        });
    }
    return null;
  };
}
