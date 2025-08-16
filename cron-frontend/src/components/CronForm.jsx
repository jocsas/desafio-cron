import { useState, useEffect } from "react";
import { createCron, updateCron } from "../services/cronApi";
import { TextField, Button, Stack, Snackbar, Alert } from "@mui/material";
import { isValidCron } from "cron-validator";

export default function CronForm({ cron, onSuccess }) {
  const [cronData, setCronData] = useState({
    uri: "",
    httpMethod: "POST",
    body: "",
    timeZone: "UTC",
    cronExp: "",
  });

  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const [cronError, setCronError] = useState("");

  useEffect(() => {
    if (cron) {
      setCronData({
        uri: cron.uri || "",
        httpMethod: cron.httpMethod || "POST",
        body: cron.body || "",
        timeZone: cron.timeZone || "UTC",
        cronExp: cron.schedule || "",
      });
    }
  }, [cron]);

  const handleChange = (field) => (e) => {
    setCronData((prev) => ({ ...prev, [field]: e.target.value }));
    if (field === "cronExp") {
      if (!isValidCron(e.target.value, { alias: true, seconds: false })) {
        setCronError("Expressão CRON inválida!");
      } else {
        setCronError("");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cronError) {
      setSnackbar({ open: true, message: "Corrija a expressão CRON antes de salvar", severity: "error" });
      return;
    }

    const { cronExp, ...rest } = cronData;
    const schedule = cronExp;

    try {
      if (cron?.id) {
        await updateCron(cron.id, { ...rest, schedule });
        setSnackbar({ open: true, message: "CRON atualizado!", severity: "success" });
      } else {
        await createCron({ ...rest, schedule });
        setSnackbar({ open: true, message: "CRON criado!", severity: "success" });
      }
      onSuccess();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Erro ao salvar CRON", severity: "error" });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <Stack spacing={2} sx={{ maxWidth: 700, margin: "30px auto" }}>
          <TextField
            label="URL"
            value={cronData.uri}
            onChange={handleChange("uri")}
            required
          />
          <TextField
            label="Body"
            value={cronData.body}
            onChange={handleChange("body")}
          />
          <TextField
            label="TimeZone"
            value={cronData.timeZone}
            onChange={handleChange("timeZone")}
          />
          <TextField
            label="Expressão CRON"
            value={cronData.cronExp}
            onChange={handleChange("cronExp")}
            error={!!cronError}
            helperText={cronError || "Ex.: */5 * * * *"}
          />
          <Button variant="contained" color="primary" type="submit">
            {cron?.id ? "Atualizar CRON" : "Criar CRON"}
          </Button>
        </Stack>
      </form>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
