export default {
  routes: [
    {
      method: "POST",
      path: "/meetings",
      handler: "custom.create",
      auth: true,
    },
  ],
};
