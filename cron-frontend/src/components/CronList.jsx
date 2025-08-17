import { useEffect, useState, useCallback } from "react";
import { getCrons, deleteCron, STATUS_STREAM_URL } from "../services/cronApi";
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
  Chip,
  Tooltip,
  Box,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import LockIcon from "@mui/icons-material/Lock";

export default function CronList({ onEdit }) {
  const [crons, setCrons] = useState([]);
  const [statusData, setStatusData] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedCron, setSelectedCron] = useState(null);
  const [sseConnected, setSseConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const formatTimestamp = (ts) => {
    if (!ts) return "-";
    
    let date;
    
    if (ts instanceof Date) {
      date = ts;
    } 
    else if (typeof ts === 'string' && ts.includes('T')) {
      date = new Date(ts);
    }
    else {
      const numericTs = Number(ts);
      if (!isNaN(numericTs)) {
        date = new Date(numericTs);
      }
    }
    
    if (!date || isNaN(date.getTime())) {
      console.warn('Timestamp inválido:', ts);
      return "-";
    }
    
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZone: "Europe/Lisbon"
    });
  };

  const fetchCrons = useCallback(async () => {
    try {
      const res = await getCrons();
      setCrons(res.data || []);
    } catch (err) {
      console.error("Erro ao buscar CRONs:", err);
      setCrons([]);
    }
  }, []);

  const getCombinedCronData = useCallback(() => {
    
    if (!crons.length) {
      return [];
    }
    
    const combined = crons.map(cron => {
      const status = statusData?.crons?.find(s => s.id === cron.id);
      
      const result = {
        ...cron,
        running: status?.running ?? false,
        lastExecutedAt: status?.lastExecutedAt ?? null,
        isLocked: status?.isLocked ?? false,
      };
      
      return result;
    });
    return combined;
  }, [crons, statusData]);

  const getStatusChip = (cron) => {
    const status = statusData?.crons?.find(s => s.id === cron.id);
    
    if (!status) {
      return <Chip label="Desconhecido" size="small" color="default" />;
    }
    
    if (status.isLocked) {
      return (
        <Tooltip title="Executando agora">
          <Chip 
            label="Executando" 
            size="small" 
            color="warning" 
            icon={<LockIcon />}
          />
        </Tooltip>
      );
    }
    
    if (status.running) {
      return (
        <Tooltip title="Ativo e aguardando próxima execução">
          <Chip 
            label="Ativo" 
            size="small" 
            color="success" 
            icon={<PlayArrowIcon />}
          />
        </Tooltip>
      );
    }
    
    return (
      <Tooltip title="Parado ou com erro">
        <Chip 
          label="Parado" 
          size="small" 
          color="error" 
          icon={<PauseIcon />}
        />
      </Tooltip>
    );
  };

  useEffect(() => {
    fetchCrons();
  }, [fetchCrons]);

  useEffect(() => {
    let eventSource;
    let reconnectTimeout;

    const connectSSE = () => {
      try {
        eventSource = new EventSource(STATUS_STREAM_URL);
        
        eventSource.onopen = () => {
          console.log('SSE conectado');
          setSseConnected(true);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            setStatusData(data);
            setLastUpdate(new Date());
            
          } catch (err) {
            console.error("Erro ao processar status do cron:", err);
          }
        };

        eventSource.onerror = (err) => {
          console.error("❌ Erro na conexão SSE:", err);
          setSseConnected(false);
          
          // Reconecta após 5 segundos (mas NÃO recarrega os crons)
          reconnectTimeout = setTimeout(() => {
            console.log("Tentando reconectar SSE...");
            connectSSE();
          }, 5000);
        };

      } catch (err) {
        console.error("Erro ao criar EventSource:", err);
        setSseConnected(false);
      }
    };

    connectSSE();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) {
        eventSource.close();
        setSseConnected(false);
      }
    };
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
      await fetchCrons();
    } catch (err) {
      console.error("Erro ao deletar CRON:", err);
    }
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setSelectedCron(null);
  };

  const combinedCrons = getCombinedCronData();

  return (
    <Stack spacing={2} sx={{ maxWidth: 1400, margin: "0 auto" }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" gutterBottom>
          CRONs Ativos ({combinedCrons.length})
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chip 
            label={sseConnected ? "Conectado" : "Desconectado"} 
            size="small" 
            color={sseConnected ? "success" : "error"}
          />
          
          {statusData && (
            <Tooltip title={`Instância: ${statusData.instanceId}`}>
              <Chip 
                label={`${statusData.activeCrons || 0}/${statusData.totalCrons || 0} ativos`}
                size="small" 
                color="info"
              />
            </Tooltip>
          )}
          
          {lastUpdate && (
            <Typography variant="caption" color="text.secondary">
              Última atualização: {formatTimestamp(lastUpdate)}
            </Typography>
          )}
        </Box>
      </Box>

      <TableContainer component={Paper}>
        <Table size="small" aria-label="CRONs Table">
          <TableHead>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell>Schedule</TableCell>
              <TableCell>Body</TableCell>
              <TableCell>URI</TableCell>
              <TableCell>Method</TableCell>
              <TableCell>TimeZone</TableCell>
              <TableCell>Última execução</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {combinedCrons.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography color="text.secondary">
                    {sseConnected ? "Nenhum CRON encontrado" : "Carregando..."}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              combinedCrons.map((cron) => (
                <TableRow 
                  key={cron.id}
                  sx={{ 
                    backgroundColor: cron.isLocked ? 'action.hover' : 'inherit',
                    '&:hover': { backgroundColor: 'action.selected' }
                  }}
                >
                  <TableCell>
                    {getStatusChip(cron)}
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {cron.schedule}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        maxWidth: 200, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {typeof cron.body === "object" && cron.body !== null
                        ? JSON.stringify(cron.body)
                        : (cron.body || "-")}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        maxWidth: 250, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {cron.uri}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={cron.httpMethod} 
                      size="small"
                      color={
                        cron.httpMethod === 'GET' ? 'info' :
                        cron.httpMethod === 'POST' ? 'success' :
                        cron.httpMethod === 'PUT' ? 'warning' :
                        cron.httpMethod === 'DELETE' ? 'error' : 'default'
                      }
                    />
                  </TableCell>
                  <TableCell>{cron.timeZone}</TableCell>
                  <TableCell>
                    <Typography 
                      variant="body2" 
                      color={cron.lastExecutedAt ? 'text.primary' : 'text.secondary'}
                    >
                      {formatTimestamp(cron.lastExecutedAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Editar">
                      <IconButton onClick={() => onEdit(cron)} size="small">
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Deletar">
                      <IconButton
                        onClick={() => handleDeleteClick(cron)}
                        size="small"
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={openDialog} onClose={handleDialogClose}>
        <DialogTitle>
          Confirmar exclusão
        </DialogTitle>
        <Typography sx={{ px: 3, pb: 2 }}>
          Tem certeza que deseja deletar o CRON "{selectedCron?.schedule}"?
          <br />
          <strong>ID:</strong> {selectedCron?.id}
        </Typography>
        <DialogActions>
          <Button onClick={handleDialogClose} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Deletar
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
