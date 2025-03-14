import React, { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Box,
  IconButton,
  Tooltip,
  Grid,
  InputAdornment,
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  FileDownload as FileDownloadIcon
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../services/api';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { Product, CreateProductDTO } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import { formatCurrency } from '../utils/format';

const validationSchema = yup.object({
  name: yup.string().required('Nome é obrigatório'),
  description: yup.string().required('Descrição é obrigatória'),
  category: yup.string().oneOf(['Frango', 'Carne', 'Peixe', 'Vegetariano'], 'Categoria inválida').required('Categoria é obrigatória'),
  costPrice: yup.number().min(0, 'Preço de custo deve ser maior que 0').required('Preço de custo é obrigatório'),
  sellingPrice: yup.number().min(0, 'Preço de venda deve ser maior que 0').required('Preço de venda é obrigatório'),
  ifoodPrice: yup.number().min(0, 'Preço do iFood deve ser maior que 0').required('Preço do iFood é obrigatório'),
  quantity: yup.number().min(0, 'Quantidade deve ser maior que 0').required('Quantidade é obrigatória'),
  weight: yup.string().required('Peso é obrigatório'),
});

// Função para calcular a margem de lucro em percentual
const calculateProfitMarginPercentage = (costPrice: number, sellingPrice: number): string => {
  if (costPrice <= 0) return '0%';
  const marginPercentage = ((sellingPrice - costPrice) / costPrice) * 100;
  return `${marginPercentage.toFixed(2)}%`;
};

// Função para calcular o valor monetário da margem de lucro
const calculateProfitMarginValue = (costPrice: number, sellingPrice: number): number => {
  return sellingPrice - costPrice;
};

export const ProductManagement: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: productService.getProducts,
  });

  const createProductMutation = useMutation({
    mutationFn: productService.createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsDialogOpen(false);
      formik.resetForm();
      showNotification('Produto criado com sucesso', 'success');
    },
    onError: () => {
      showNotification('Erro ao criar produto', 'error');
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateProductDTO> }) =>
      productService.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsDialogOpen(false);
      setEditingProduct(null);
      formik.resetForm();
      showNotification('Produto atualizado com sucesso', 'success');
    },
    onError: () => {
      showNotification('Erro ao atualizar produto', 'error');
    },
  });

  const toggleProductStatusMutation = useMutation({
    mutationFn: productService.toggleProductStatus,
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showNotification(
        `Produto ${product.isActive ? 'ativado' : 'desativado'} com sucesso`,
        'success'
      );
    },
    onError: () => {
      showNotification('Erro ao alterar status do produto', 'error');
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: productService.deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showNotification('Produto excluído com sucesso', 'success');
    },
    onError: () => {
      showNotification('Erro ao excluir produto', 'error');
    },
  });

  const formik = useFormik<CreateProductDTO>({
    initialValues: {
      name: '',
      description: '',
      category: 'Frango',
      costPrice: 0,
      sellingPrice: 0,
      ifoodPrice: 0,
      quantity: 0,
      weight: '',
    },
    validationSchema,
    onSubmit: async (values) => {
      try {
        if (editingProduct) {
          await updateProductMutation.mutateAsync({
            id: editingProduct._id,
            data: values,
          });
        } else {
          await createProductMutation.mutateAsync(values);
        }
      } catch (error) {
        console.error('Erro ao salvar produto:', error);
      }
    },
  });

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    formik.setValues({
      name: product.name,
      description: product.description,
      category: product.category,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      ifoodPrice: product.ifoodPrice,
      quantity: product.quantity,
      weight: product.weight,
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
    formik.resetForm();
  };

  const handleExportToExcel = async () => {
    try {
      if (products.length === 0) {
        showNotification('Não há produtos cadastrados para exportar', 'warning');
        return;
      }
      
      const blob = await productService.exportToExcel();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'produtos.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showNotification('Exportação concluída com sucesso', 'success');
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      showNotification('Erro ao exportar produtos para Excel', 'error');
    }
  };

  if (isLoading) {
    return <Typography>Carregando...</Typography>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4">Gerenciamento de Produtos</Typography>
        <Box>
          <Tooltip title="Exportar para Excel">
            <Button
              variant="outlined"
              color="primary"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportToExcel}
              sx={{ mr: 2 }}
            >
              Exportar Excel
            </Button>
          </Tooltip>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setIsDialogOpen(true)}
          >
            Novo Produto
          </Button>
        </Box>
      </Box>

      <TableContainer component={Paper} sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width="15%">Nome</TableCell>
              <TableCell width="10%">Categoria</TableCell>
              <TableCell width="8%" align="center">Peso</TableCell>
              <TableCell width="8%" align="center">Qtd</TableCell>
              <TableCell width="10%" align="right">
                <Tooltip title="Preço de Custo">
                  <span>Custo (R$)</span>
                </Tooltip>
              </TableCell>
              <TableCell width="10%" align="right">
                <Tooltip title="Preço de Venda">
                  <span>Venda (R$)</span>
                </Tooltip>
              </TableCell>
              <TableCell width="10%" align="right">
                <Tooltip title="Preço no iFood">
                  <span>iFood (R$)</span>
                </Tooltip>
              </TableCell>
              <TableCell width="8%" align="center">
                <Tooltip title="Percentual de Margem de Lucro">
                  <span>Margem %</span>
                </Tooltip>
              </TableCell>
              <TableCell width="10%" align="right">
                <Tooltip title="Valor Monetário da Margem de Lucro">
                  <span>Lucro (R$)</span>
                </Tooltip>
              </TableCell>
              <TableCell width="6%" align="center">Status</TableCell>
              <TableCell width="5%" align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product._id} hover>
                <TableCell>{product.name}</TableCell>
                <TableCell>{product.category}</TableCell>
                <TableCell align="center">{product.weight}</TableCell>
                <TableCell align="center">{product.quantity}</TableCell>
                <TableCell align="right">{formatCurrency(product.costPrice)}</TableCell>
                <TableCell align="right">{formatCurrency(product.sellingPrice)}</TableCell>
                <TableCell align="right">{formatCurrency(product.ifoodPrice)}</TableCell>
                <TableCell align="center">
                  {calculateProfitMarginPercentage(product.costPrice, product.sellingPrice)}
                </TableCell>
                <TableCell align="right">
                  {formatCurrency(calculateProfitMarginValue(product.costPrice, product.sellingPrice))}
                </TableCell>
                <TableCell align="center">
                  <Box 
                    component="span" 
                    sx={{ 
                      backgroundColor: product.isActive ? '#e6f4ea' : '#fdeded',
                      color: product.isActive ? '#0d652d' : '#d32f2f',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: 'bold'
                    }}
                  >
                    {product.isActive ? 'ATIVO' : 'INATIVO'}
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                    <Tooltip title="Editar">
                      <IconButton
                        color="primary"
                        onClick={() => handleEdit(product)}
                        size="small"
                        sx={{ padding: '4px' }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={product.isActive ? "Desativar" : "Ativar"}>
                      <IconButton
                        color={product.isActive ? 'error' : 'success'}
                        onClick={() => toggleProductStatusMutation.mutate(product._id)}
                        size="small"
                        sx={{ padding: '4px' }}
                      >
                        {product.isActive ? 'D' : 'A'}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Excluir">
                      <IconButton
                        color="error"
                        onClick={() => deleteProductMutation.mutate(product._id)}
                        size="small"
                        sx={{ padding: '4px' }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog
        open={isDialogOpen}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingProduct ? 'Editar Produto' : 'Novo Produto'}
        </DialogTitle>
        <form onSubmit={formik.handleSubmit}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  margin="normal"
                  id="name"
                  name="name"
                  label="Nome"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  error={formik.touched.name && Boolean(formik.errors.name)}
                  helperText={formik.touched.name && formik.errors.name}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  margin="normal"
                  id="description"
                  name="description"
                  label="Descrição"
                  multiline
                  rows={3}
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  error={formik.touched.description && Boolean(formik.errors.description)}
                  helperText={formik.touched.description && formik.errors.description}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  margin="normal"
                  id="category"
                  name="category"
                  label="Categoria"
                  select
                  value={formik.values.category}
                  onChange={formik.handleChange}
                  error={formik.touched.category && Boolean(formik.errors.category)}
                  helperText={formik.touched.category && formik.errors.category}
                >
                  <MenuItem value="Frango">Frango</MenuItem>
                  <MenuItem value="Carne">Carne</MenuItem>
                  <MenuItem value="Peixe">Peixe</MenuItem>
                  <MenuItem value="Vegetariano">Vegetariano</MenuItem>
                </TextField>
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  margin="normal"
                  id="weight"
                  name="weight"
                  label="Peso"
                  value={formik.values.weight}
                  onChange={formik.handleChange}
                  error={formik.touched.weight && Boolean(formik.errors.weight)}
                  helperText={formik.touched.weight && formik.errors.weight}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  margin="normal"
                  id="quantity"
                  name="quantity"
                  label="Quantidade"
                  type="number"
                  value={formik.values.quantity}
                  onChange={formik.handleChange}
                  error={formik.touched.quantity && Boolean(formik.errors.quantity)}
                  helperText={formik.touched.quantity && formik.errors.quantity}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  margin="normal"
                  id="costPrice"
                  name="costPrice"
                  label="Preço de Custo"
                  type="number"
                  value={formik.values.costPrice}
                  onChange={formik.handleChange}
                  error={formik.touched.costPrice && Boolean(formik.errors.costPrice)}
                  helperText={formik.touched.costPrice && formik.errors.costPrice}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                  }}
                  inputProps={{
                    step: "0.01"
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  margin="normal"
                  id="sellingPrice"
                  name="sellingPrice"
                  label="Preço de Venda"
                  type="number"
                  value={formik.values.sellingPrice}
                  onChange={formik.handleChange}
                  error={formik.touched.sellingPrice && Boolean(formik.errors.sellingPrice)}
                  helperText={formik.touched.sellingPrice && formik.errors.sellingPrice}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                  }}
                  inputProps={{
                    step: "0.01"
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  margin="normal"
                  id="ifoodPrice"
                  name="ifoodPrice"
                  label="Preço iFood"
                  type="number"
                  value={formik.values.ifoodPrice}
                  onChange={formik.handleChange}
                  error={formik.touched.ifoodPrice && Boolean(formik.errors.ifoodPrice)}
                  helperText={formik.touched.ifoodPrice && formik.errors.ifoodPrice}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                  }}
                  inputProps={{
                    step: "0.01"
                  }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancelar</Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={formik.isSubmitting}
            >
              {editingProduct ? 'Atualizar' : 'Criar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
}; 