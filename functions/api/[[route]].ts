import app from "../../api/index";

export const onRequest: PagesFunction = ({ request }) => app.fetch(request);
