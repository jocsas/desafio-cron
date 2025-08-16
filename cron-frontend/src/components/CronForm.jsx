import { useState, useEffect } from "react";
import { createCron, updateCron } from "../services/cronApi";
import {
  TextField,
  Button,
  Select,
  MenuItem,
  Radio,
  FormControlLabel,
  RadioGroup,
  Stack
} from "@mui/material";

function simpleToCron({ minutes, hours, days }) {
  const minPart = minutes ? `*/${minutes}` : "*";
  const hourPart = hours ? `*/${hours}` : "*";
  const dayPart = days ? `*/${days}` : "*";
  return `${minPart} ${hourPart} ${dayPart} * *`;
}

export default function CronForm({ cron, onSuccess }) {
  const [cronData, setCronData] = useState({
    uri: "",
    httpMethod: "POST",
    body: "",
    timeZone: "UTC",
    mode: "simple",
    minutes: "",
    hours: "",
    days: "",
    cronExp: "",
  });

  useEffect(() => {
    if (cron) {
      const isSimple = !cron.schedule.includes("* * * * *") || false;
      setCronData({
        uri: cron.uri || "",
        httpMethod: cron.httpMethod || "POST",
        body: cron.body || "",
        timeZone: cron.timeZone || "UTC",
        mode: isSimple ? "simple" : "cron",
        minutes: cron.minutes || "",
        hours: cron.hours || "",
        days: cron.days || "",
        cronExp: cron.schedule || "",
      });
    }
  }, [cron]);

  const handleChange = (field) => (e) => {
    setCronData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { mode, minutes, hours, days, cronExp, ...rest } = cronData;
    const schedule =
      mode === "simple" ? simpleToCron({ minutes, hours, days }) : cronExp;

    try {
      if (cron?.id) {
        await updateCron(cron.id, { ...rest, schedule });
        alert("CRON atualizado!");
      } else {
        await createCron({ ...rest, schedule });
        alert("CRON criado!");
      }
      onSuccess();
      
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar CRON");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2} sx={{ maxWidth: 700, margin: "30px auto" }}>
        <TextField
          label="URL"
          value={cronData.uri}
          onChange={handleChange("uri")}
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
          label="Body"
          value={cronData.body}
          onChange={handleChange("body")}
        />
        <TextField
          label="TimeZone"
          value={cronData.timeZone}
          onChange={handleChange("timeZone")}
        />

        <RadioGroup row value={cronData.mode} onChange={handleChange("mode")}>
          <FormControlLabel value="simple" control={<Radio />} label="Simples" />
          <FormControlLabel value="cron" control={<Radio />} label="CRON" />
        </RadioGroup>

        {cronData.mode === "simple" ? (
          <Stack direction="row" spacing={1}>
            <TextField
              label="Minutos"
              value={cronData.minutes}
              onChange={handleChange("minutes")}
            />
            <TextField
              label="Horas"
              value={cronData.hours}
              onChange={handleChange("hours")}
            />
            <TextField
              label="Dias"
              value={cronData.days}
              onChange={handleChange("days")}
            />
          </Stack>
        ) : (
          <TextField
            label="Expressão CRON"
            value={cronData.cronExp}
            onChange={handleChange("cronExp")}
          />
        )}

        <Button variant="contained" color="primary" type="submit">
          {cron?.id ? "Atualizar CRON" : "Criar CRON"}
        </Button>
      </Stack>
    </form>
  );
}
