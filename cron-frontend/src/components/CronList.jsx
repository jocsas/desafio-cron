import { useEffect, useState } from "react";
import { getCrons, deleteCron } from "../services/cronApi";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  IconButton,
  Stack,
  Dialog,
  DialogTitle,
  DialogActions,
  Button,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";

export default function CronList({ onEdit }) {
  const [crons, setCrons] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCron, setSelectedCron] = useState(null);

  const fetchCrons = async () => {
    try {
      const res = await getCrons();
      setCrons(res.data);
    } catch (err) {
      console.error("Erro ao buscar CRONs:", err);
    }
  };

  useEffect(() => {
    fetchCrons();
  }, []);

  const handleDeleteClick = (cron) => {
    setSelectedCron(cron);
    setOpenDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteCron(selectedCron.id);
      setOpenDialog(false);
      setSelectedCron(null);
      fetchCrons();
    } catch (err) {
      console.error("Erro ao deletar CRON:", err);
    }
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setSelectedCron(null);
  };

  return (
    <Stack spacing={2} sx={{ maxWidth: 1000, margin: "0 auto" }}>
      <Typography variant="h5" gutterBottom>
        CRONs Ativos
      </Typography>

      <TableContainer component={Paper}>
        <Table size="small" aria-label="CRONs Table">
          <TableHead>
            <TableRow>
              <TableCell>Schedule</TableCell>
              <TableCell>Body</TableCell>
              <TableCell>URI</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>TimeZone</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {crons.map((c) => (
              <TableRow key={c.id}>
                <TableCell>{c.schedule}</TableCell>
                <TableCell>
                  {typeof c.body === "object" ? JSON.stringify(c.body) : c.body}
                </TableCell>
                <TableCell>{c.uri}</TableCell>
                <TableCell>{c.httpMethod}</TableCell>
                <TableCell>{c.timeZone}</TableCell>
                <TableCell>
                  <IconButton onClick={() => onEdit(c)} size="small">
                    <EditIcon fontSize="small" />
                  </IconButton>
                  <IconButton onClick={() => handleDeleteClick(c)} size="small">
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogTitle>
          Tem certeza que deseja deletar "{selectedCron?.id}"?
        </DialogTitle>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleDeleteConfirm} color="error">
            Deletar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
