import app from "../../worker/index";

export const onRequest: PagesFunction = ({ request }) => app.fetch(request);
