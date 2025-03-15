import React, { useMemo, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  Alert,
  IconButton,
  Tooltip,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Warning as WarningIcon,
  AccessTime as AccessTimeIcon,
  Info as InfoIcon,
  LocalOffer as LocalOfferIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productService } from '../services/api';
import { Product } from '../types';
import { formatCurrency } from '../utils/format';
import { useNotification } from '../contexts/NotificationContext';

// Valor de referência para alerta de estoque baixo (40%)
const LOW_STOCK_THRESHOLD = 0.4;

// Tempo antes da validade (em milissegundos) para alerta - 2 meses = 60 dias
const EXPIRATION_WARNING_THRESHOLD = 60 * 24 * 60 * 60 * 1000;

// Estoque ideal para cada produto (em uma aplicação real, isso viria de uma configuração)
const getIdealStock = (product: Product): number => {
  // Valores arbitrários para demonstração
  // Em uma implementação real, isso poderia ser configurado pelo usuário
  switch (product.category) {
    case 'Frango':
      return 20;
    case 'Carne':
      return 15;
    case 'Peixe':
      return 10;
    case 'Vegetariano':
      return 12;
    default:
      return 15;
  }
};

// Função para verificar se um produto está próximo de vencer (2 meses)
const isNearExpiration = (expirationDate: string): boolean => {
  if (!expirationDate) return false;
  
  const expiration = new Date(expirationDate).getTime();
  const today = new Date().getTime();
  const timeRemaining = expiration - today;
  
  return timeRemaining > 0 && timeRemaining <= EXPIRATION_WARNING_THRESHOLD;
};

// Função para verificar se um produto está vencido
const isExpired = (expirationDate: string): boolean => {
  if (!expirationDate) return false;
  
  const expiration = new Date(expirationDate).getTime();
  const today = new Date().getTime();
  
  return expiration < today;
};

// Função para calcular sugestão de desconto com base no tempo até a validade
const calculateSuggestedDiscount = (expirationDate: string): number => {
  if (!expirationDate) return 0;
  
  const expiration = new Date(expirationDate).getTime();
  const today = new Date().getTime();
  const timeRemaining = expiration - today;
  
  if (timeRemaining <= 0) return 50; // Produto vencido (desconto máximo)
  
  // Quanto mais perto da validade, maior o desconto
  // 2 meses = 60 dias = desconto mínimo (10%)
  // 7 dias = desconto médio (25%)
  // 1 dia = desconto máximo (40%)
  const daysRemaining = timeRemaining / (24 * 60 * 60 * 1000);
  
  if (daysRemaining <= 1) return 40;
  if (daysRemaining <= 7) return 25;
  if (daysRemaining <= 30) return 15;
  return 10;
};

export const StockManagement: React.FC = () => {
  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: productService.getProducts,
  });
  
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  
  // Estado para controlar o diálogo de promoção
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [promoPrice, setPromoPrice] = useState(0);

  // Calcular os totais do estoque
  const stockSummary = useMemo(() => {
    let totalCostValue = 0;
    let totalSellingValue = 0;
    let totalIfoodValue = 0;
    let totalItems = 0;
    let lowStockCount = 0;
    let expiringProductsCount = 0;
    let expiredProductsCount = 0;

    products.forEach((product) => {
      if (product.isActive) {
        totalCostValue += product.costPrice * product.quantity;
        totalSellingValue += product.sellingPrice * product.quantity;
        totalIfoodValue += product.ifoodPrice * product.quantity;
        totalItems += product.quantity;
        
        const idealStock = getIdealStock(product);
        if (product.quantity < idealStock * LOW_STOCK_THRESHOLD) {
          lowStockCount++;
        }
        
        if (isNearExpiration(product.expirationDate)) {
          expiringProductsCount++;
        }
        
        if (isExpired(product.expirationDate)) {
          expiredProductsCount++;
        }
      }
    });

    return {
      totalCostValue,
      totalSellingValue,
      totalIfoodValue,
      totalItems,
      lowStockCount,
      expiringProductsCount,
      expiredProductsCount,
    };
  }, [products]);

  // Função que retorna o nível de estoque (percentual)
  const getStockLevel = (product: Product): number => {
    const idealStock = getIdealStock(product);
    return (product.quantity / idealStock) * 100;
  };

  // Função que retorna a cor do nível de estoque
  const getStockLevelColor = (level: number): string => {
    if (level < 40) return '#f44336'; // Vermelho
    if (level < 70) return '#ff9800'; // Laranja
    return '#4caf50'; // Verde
  };
  
  // Função para abrir o diálogo de promoção
  const handleOpenPromoDialog = (product: Product) => {
    setSelectedProduct(product);
    const suggestedDiscount = calculateSuggestedDiscount(product.expirationDate);
    setDiscountPercentage(suggestedDiscount);
    setPromoPrice(product.sellingPrice * (1 - suggestedDiscount / 100));
    setPromoDialogOpen(true);
  };
  
  // Função para calcular o preço com desconto quando o usuário alterar o percentual
  const handleDiscountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedProduct) return;
    
    const newDiscount = Math.max(0, Math.min(90, Number(e.target.value) || 0));
    setDiscountPercentage(newDiscount);
    setPromoPrice(selectedProduct.sellingPrice * (1 - newDiscount / 100));
  };
  
  // Função para calcular o desconto percentual quando o usuário alterar o preço
  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedProduct) return;
    
    const newPrice = Math.max(0, Number(e.target.value) || 0);
    setPromoPrice(newPrice);
    
    if (newPrice < selectedProduct.sellingPrice) {
      const newDiscount = ((selectedProduct.sellingPrice - newPrice) / selectedProduct.sellingPrice) * 100;
      setDiscountPercentage(Math.round(newDiscount * 100) / 100);
    } else {
      setDiscountPercentage(0);
    }
  };
  
  // Função para aplicar a promoção (em um sistema real, isso enviaria para a API)
  const handleApplyPromotion = () => {
    if (!selectedProduct) return;
    
    // Em um sistema real, aqui você enviaria a promoção para a API
    showNotification(
      `Promoção aplicada para ${selectedProduct.name} com ${discountPercentage.toFixed(1)}% de desconto.`, 
      'success'
    );
    
    setPromoDialogOpen(false);
    setSelectedProduct(null);
  };
  
  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Product> }) =>
      productService.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      showNotification('Promoção aplicada com sucesso', 'success');
    },
    onError: () => {
      showNotification('Erro ao aplicar promoção', 'error');
    },
  });

  if (isLoading) {
    return <Typography>Carregando...</Typography>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4">Gerenciamento de Estoque</Typography>
      </Box>

      {/* Resumo do estoque */}
      <Box mb={4}>
        <Paper sx={{ p: 3, mb: 3, backgroundColor: '#f8f9fa' }}>
          <Typography variant="h6" gutterBottom sx={{ mb: 2, color: 'primary.main' }}>
            Resumo do Estoque
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={2}>
            <Paper elevation={1} sx={{ p: 2, flex: 1, minWidth: '200px' }}>
              <Typography variant="subtitle2" color="textSecondary">
                Valor Total de Custo
              </Typography>
              <Typography variant="h5" color="text.primary" sx={{ mt: 1 }}>
                {formatCurrency(stockSummary.totalCostValue)}
              </Typography>
            </Paper>
            <Paper elevation={1} sx={{ p: 2, flex: 1, minWidth: '200px' }}>
              <Typography variant="subtitle2" color="textSecondary">
                Valor Total de Venda
              </Typography>
              <Typography variant="h5" color="primary.main" sx={{ mt: 1 }}>
                {formatCurrency(stockSummary.totalSellingValue)}
              </Typography>
            </Paper>
            <Paper elevation={1} sx={{ p: 2, flex: 1, minWidth: '200px' }}>
              <Typography variant="subtitle2" color="textSecondary">
                Valor Total iFood
              </Typography>
              <Typography variant="h5" color="secondary.main" sx={{ mt: 1 }}>
                {formatCurrency(stockSummary.totalIfoodValue)}
              </Typography>
            </Paper>
            <Paper elevation={1} sx={{ p: 2, flex: 1, minWidth: '200px' }}>
              <Typography variant="subtitle2" color="textSecondary">
                Itens em Estoque
              </Typography>
              <Typography variant="h5" color="text.primary" sx={{ mt: 1 }}>
                {stockSummary.totalItems}
              </Typography>
            </Paper>
          </Box>
        </Paper>

        {/* Alertas */}
        <Box display="flex" flexDirection="column" gap={2}>
          {stockSummary.lowStockCount > 0 && (
            <Alert severity="warning">
              <Typography variant="subtitle1">
                Estoque Baixo: {stockSummary.lowStockCount} produtos estão com estoque abaixo de 40% do ideal.
              </Typography>
            </Alert>
          )}
          
          {stockSummary.expiringProductsCount > 0 && (
            <Alert severity="warning" icon={<AccessTimeIcon />}>
              <Typography variant="subtitle1">
                Produtos a Vencer: {stockSummary.expiringProductsCount} produtos irão vencer nos próximos 2 meses.
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Considere criar promoções para estes itens. Clique no botão de oferta na tabela para gerar sugestões.
              </Typography>
            </Alert>
          )}
          
          {stockSummary.expiredProductsCount > 0 && (
            <Alert severity="error">
              <Typography variant="subtitle1">
                Produtos Vencidos: {stockSummary.expiredProductsCount} produtos estão com a data de validade vencida.
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Estes produtos devem ser removidos do estoque ou verificados imediatamente.
              </Typography>
            </Alert>
          )}
        </Box>
      </Box>

      {/* Tabela de produtos */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width="18%">Produto</TableCell>
              <TableCell width="8%">Categoria</TableCell>
              <TableCell width="8%" align="center">Quantidade</TableCell>
              <TableCell width="13%">Nível de Estoque</TableCell>
              <TableCell width="12%" align="center">Validade</TableCell>
              <TableCell width="13%" align="right">Valor de Custo</TableCell>
              <TableCell width="13%" align="right">Valor de Venda</TableCell>
              <TableCell width="10%" align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.filter(product => product.isActive).map((product) => {
              const stockLevel = getStockLevel(product);
              const isLowStock = stockLevel < (LOW_STOCK_THRESHOLD * 100);
              const isExpiringSoon = isNearExpiration(product.expirationDate);
              const productExpired = isExpired(product.expirationDate);
              
              // Definir a cor de fundo da linha com base nas condições
              let rowBgColor = 'inherit';
              if (productExpired) {
                rowBgColor = 'rgba(244, 67, 54, 0.15)'; // Vermelho mais forte para vencidos
              } else if (isExpiringSoon) {
                rowBgColor = 'rgba(255, 152, 0, 0.15)'; // Laranja para prestes a vencer
              } else if (isLowStock) {
                rowBgColor = 'rgba(244, 67, 54, 0.08)'; // Vermelho claro para estoque baixo
              }
              
              return (
                <TableRow key={product._id} hover sx={{ backgroundColor: rowBgColor }}>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      {isLowStock && (
                        <Tooltip title="Estoque baixo">
                          <WarningIcon color="warning" sx={{ mr: 1 }} />
                        </Tooltip>
                      )}
                      {product.name}
                    </Box>
                  </TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell align="center">
                    <Box display="flex" alignItems="center" justifyContent="center">
                      <Typography variant="body2" sx={{ fontWeight: isLowStock ? 'bold' : 'regular' }}>
                        {product.quantity}
                      </Typography>
                      <Tooltip title={`Estoque ideal: ${getIdealStock(product)}`}>
                        <IconButton size="small">
                          <InfoIcon fontSize="small" color="action" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ flex: 1 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={Math.min(stockLevel, 100)} 
                          sx={{ 
                            height: 8, 
                            borderRadius: 5,
                            backgroundColor: 'rgba(0, 0, 0, 0.1)',
                            '& .MuiLinearProgress-bar': {
                              backgroundColor: getStockLevelColor(stockLevel)
                            }
                          }}
                        />
                      </Box>
                      <Chip 
                        label={`${Math.round(stockLevel)}%`}
                        size="small"
                        sx={{ 
                          backgroundColor: getStockLevelColor(stockLevel),
                          color: 'white',
                          fontWeight: 'bold',
                          minWidth: '50px'
                        }}
                      />
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    {product.expirationDate ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            fontWeight: isExpiringSoon || productExpired ? 'bold' : 'regular',
                            color: productExpired ? 'error.main' : isExpiringSoon ? 'warning.main' : 'inherit'
                          }}
                        >
                          {new Date(product.expirationDate).toLocaleDateString('pt-BR')}
                        </Typography>
                        {isExpiringSoon && !productExpired && (
                          <Chip 
                            label="A vencer" 
                            size="small" 
                            color="warning" 
                            sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }} 
                          />
                        )}
                        {productExpired && (
                          <Chip 
                            label="Vencido" 
                            size="small" 
                            color="error" 
                            sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }} 
                          />
                        )}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Não informada
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">{formatCurrency(product.costPrice * product.quantity)}</TableCell>
                  <TableCell align="right">{formatCurrency(product.sellingPrice * product.quantity)}</TableCell>
                  <TableCell align="center">
                    {(isExpiringSoon || productExpired) && (
                      <Tooltip title="Criar Promoção">
                        <IconButton 
                          color="secondary" 
                          size="small"
                          onClick={() => handleOpenPromoDialog(product)}
                        >
                          <LocalOfferIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            
            {/* Totais */}
            <TableRow>
              <TableCell colSpan={5} align="right" sx={{ fontWeight: 'bold' }}>
                Total
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(stockSummary.totalCostValue)}
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                {formatCurrency(stockSummary.totalSellingValue)}
              </TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {/* Legenda */}
      <Box mt={3} p={2} component={Paper} variant="outlined">
        <Typography variant="subtitle2" gutterBottom>
          Legenda:
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={3} mt={1}>
          <Box display="flex" alignItems="center">
            <Box sx={{ width: 16, height: 16, backgroundColor: '#f44336', borderRadius: '50%', mr: 1 }} />
            <Typography variant="body2">Estoque Crítico (Menos de 40%)</Typography>
          </Box>
          <Box display="flex" alignItems="center">
            <Box sx={{ width: 16, height: 16, backgroundColor: '#ff9800', borderRadius: '50%', mr: 1 }} />
            <Typography variant="body2">Estoque Moderado (Entre 40% e 70%)</Typography>
          </Box>
          <Box display="flex" alignItems="center">
            <Box sx={{ width: 16, height: 16, backgroundColor: '#4caf50', borderRadius: '50%', mr: 1 }} />
            <Typography variant="body2">Estoque Adequado (Acima de 70%)</Typography>
          </Box>
          <Box display="flex" alignItems="center">
            <AccessTimeIcon sx={{ color: 'warning.main', width: 16, height: 16, mr: 1 }} />
            <Typography variant="body2">Produtos a Vencer (Próximos 2 meses)</Typography>
          </Box>
        </Box>
      </Box>
      
      {/* Diálogo de Promoção */}
      <Dialog open={promoDialogOpen} onClose={() => setPromoDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'secondary.main', color: 'white' }}>
          Sugestão de Promoção
        </DialogTitle>
        <DialogContent dividers>
          {selectedProduct && (
            <Box sx={{ p: 1 }}>
              <Typography variant="h6" gutterBottom>
                {selectedProduct.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Este produto vencerá em {new Date(selectedProduct.expirationDate).toLocaleDateString('pt-BR')}. 
                Sugerimos um desconto promocional para incentivar a venda rápida.
              </Typography>
              
              <Box 
                sx={{ 
                  mb: 3, 
                  p: 2, 
                  bgcolor: 'secondary.light', 
                  color: 'secondary.contrastText',
                  borderRadius: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <Typography variant="overline">
                  Preço Original
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                  {formatCurrency(selectedProduct.sellingPrice)}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Porcentagem de Desconto Sugerida
                </Typography>
                <TextField
                  fullWidth
                  variant="outlined"
                  type="number"
                  value={discountPercentage}
                  onChange={handleDiscountChange}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                  inputProps={{
                    min: 0,
                    max: 90,
                    step: 1,
                  }}
                />
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Preço Promocional Sugerido
                </Typography>
                <TextField
                  fullWidth
                  variant="outlined"
                  type="number"
                  value={promoPrice}
                  onChange={handlePriceChange}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                  }}
                  inputProps={{
                    min: 0,
                    step: 0.01,
                  }}
                />
              </Box>
              
              <Alert severity="info" sx={{ mb: 2 }}>
                Com esta promoção, você terá um desconto de {discountPercentage.toFixed(1)}% 
                sobre o preço original. Economia para o cliente de {formatCurrency(selectedProduct.sellingPrice - promoPrice)}.
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPromoDialogOpen(false)}>
            Cancelar
          </Button>
          <Button 
            variant="contained" 
            color="secondary"
            onClick={handleApplyPromotion}
            startIcon={<LocalOfferIcon />}
          >
            Aplicar Promoção
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}; 