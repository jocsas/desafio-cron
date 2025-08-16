import { useState, useEffect } from "react";
import { createCron, updateCron } from "../services/cronApi";
import {
  TextField,
  Button,
  Stack,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { isValidCron } from "cron-validator";

export default function CronForm({ cron, onSuccess }) {
  const [cronData, setCronData] = useState({
    uri: "",
    httpMethod: "POST",
    body: "{}",
    timeZone: "UTC",
    cronExp: "",
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [cronError, setCronError] = useState("");
  const [bodyError, setBodyError] = useState("");
  const [urlError, setUrlError] = useState("");

  useEffect(() => {
    if (cron) {
      setCronData({
        uri: cron.uri || "",
        httpMethod: cron.httpMethod || "POST",
        body: cron.body ? JSON.stringify(cron.body, null, 2) : "{}",
        timeZone: cron.timeZone || "UTC",
        cronExp: cron.schedule || "",
      });
    }
  }, [cron]);

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setCronData((prev) => ({ ...prev, [field]: value }));

    if (field === "cronExp") {
      setCronError(
        isValidCron(value, { alias: true, seconds: false })
          ? ""
          : "Expressão CRON inválida!"
      );
    }

    if (field === "body") {
      try {
        JSON.parse(value);
        setBodyError("");
      } catch {
        setBodyError("JSON inválido!");
      }
    }

    if (field === "uri") {
      try {
        new URL(value);
        setUrlError("");
      } catch {
        setUrlError("URL inválida!");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cronError || bodyError || urlError) {
      setSnackbar({
        open: true,
        message: "Corrija os erros antes de salvar",
        severity: "error",
      });
      return;
    }

    const { cronExp, body, ...rest } = cronData;
    let parsedBody;
    try {
      parsedBody = JSON.parse(body);
    } catch {
      setSnackbar({
        open: true,
        message: "JSON inválido no body",
        severity: "error",
      });
      return;
    }

    const schedule = cronExp;

    try {
      if (cron?.id) {
        await updateCron(cron.id, { ...rest, schedule, body: parsedBody });
        setSnackbar({
          open: true,
          message: "CRON atualizado!",
          severity: "success",
        });
      } else {
        await createCron({ ...rest, schedule, body: parsedBody });
        setSnackbar({
          open: true,
          message: "CRON criado!",
          severity: "success",
        });
      }
      onSuccess();
    } catch (err) {
      console.error(err);
      setSnackbar({
        open: true,
        message: "Erro ao salvar CRON",
        severity: "error",
      });
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
            error={!!urlError}
            helperText={urlError || "Ex.: https://meu-servidor.com/webhook"}
            required
          />

          <Select
            value={cronData.httpMethod}
            onChange={handleChange("httpMethod")}
          >
            {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </Select>

          <TextField
            label="Body (JSON)"
            value={cronData.body}
            onChange={handleChange("body")}
            error={!!bodyError}
            helperText={bodyError || 'Ex.: { "message": "Hello" }'}
            multiline
            minRows={4}
          />

          <FormControl fullWidth>
            <InputLabel id="timezone-label">TimeZone</InputLabel>
            <Select
              labelId="timezone-label"
              value={cronData.timeZone}
              onChange={handleChange("timeZone")}
              label="TimeZone"
            >
              <MenuItem value="UTC">UTC</MenuItem>
              {Intl.supportedValuesOf("timeZone").map((tz) => (
                <MenuItem key={tz} value={tz}>
                  {tz}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

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
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
