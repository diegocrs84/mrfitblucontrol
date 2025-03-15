import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  Alert,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Autocomplete,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Menu,
  DialogContentText,
  Switch,
  FormControlLabel,
  ListItemIcon,
  Divider,
  LinearProgress,
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Delete as DeleteIcon,
  FileDownload as FileDownloadIcon,
  FileUpload as FileUploadIcon,
  Search as SearchIcon,
  FilterAlt as FilterIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
  Psychology as PsychologyIcon,
  TrendingUp as TrendingUpIcon,
  ShoppingBasket as ShoppingBasketIcon,
  Storefront as StorefrontIcon,
  BarChart as BarChartIcon,
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
  expirationDate: yup.date().required('Data de validade é obrigatória'),
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

// Função para calcular a sugestão de preço com base no mercado
const calculateMarketSuggestions = (product: Product) => {
  // Valores de referência do mercado (em um cenário real, viriam de uma API)
  const marketData = {
    baseMargin: 45, // Margem base para marmitas fitness é em média 45%
    premiumFactor: 1.2, // Fator adicional para produtos premium
    categories: {
      Frango: { basePriceMultiplier: 1.0 },
      Carne: { basePriceMultiplier: 1.2 },
      Peixe: { basePriceMultiplier: 1.3 },
      Vegetariano: { basePriceMultiplier: 1.1 }
    },
    // Faixas de peso e seus multiplicadores
    weightRanges: [
      { max: 250, multiplier: 0.9 },
      { max: 350, multiplier: 1.0 },
      { max: 450, multiplier: 1.15 },
      { max: 1000, multiplier: 1.3 }
    ]
  };

  // Pegar o multiplicador por categoria
  const categoryMultiplier = marketData.categories[product.category as keyof typeof marketData.categories]?.basePriceMultiplier || 1;
  
  // Extrair o valor numérico do peso (remover 'g', 'kg', etc.)
  const weightValue = parseInt(product.weight.replace(/[^0-9]/g, '')) || 300;
  
  // Encontrar o multiplicador apropriado para o peso
  let weightMultiplier = 1;
  for (const range of marketData.weightRanges) {
    if (weightValue <= range.max) {
      weightMultiplier = range.multiplier;
      break;
    }
  }
  
  // Calcular a margem sugerida
  const suggestedMargin = marketData.baseMargin * categoryMultiplier * weightMultiplier;
  
  // Calcular o preço sugerido com base na margem
  const suggestedPrice = product.costPrice * (1 + suggestedMargin / 100);
  
  // Verificar se o preço atual está abaixo ou acima da sugestão
  const currentMargin = ((product.sellingPrice - product.costPrice) / product.costPrice) * 100;
  const priceDifference = product.sellingPrice - suggestedPrice;
  const marginDifference = currentMargin - suggestedMargin;
  
  return {
    suggestedMargin: suggestedMargin.toFixed(2),
    suggestedPrice: suggestedPrice,
    currentMargin: currentMargin.toFixed(2),
    priceDifference: priceDifference,
    marginDifference: marginDifference.toFixed(2),
    isUnderpriced: priceDifference < 0,
    // Adicionando valores numéricos para facilitar comparações
    numericMarginDifference: marginDifference
  };
};

// Interface para resposta da IA
interface AIMarketSuggestion {
  suggestedPrice: number;
  suggestedMargin: number;
  confidence: number; // 0-100
  marketTrend: 'up' | 'down' | 'stable';
  competitorsAnalysis: string;
  reasoning: string;
  additionalInsights: string[];
  isLoading: boolean;
  timestamp: Date;
}

// Tempo antes da validade (em milissegundos) para alerta - 2 meses = 60 dias
const EXPIRATION_WARNING_THRESHOLD = 60 * 24 * 60 * 60 * 1000;

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

// Adicionar esta função para formatar a data corretamente
const formatDate = (dateString: string): string => {
  if (!dateString) return 'Não informada';
  
  try {
    const date = new Date(dateString);
    // Verificar se é uma data válida
    if (isNaN(date.getTime())) {
      return 'Data inválida';
    }
    return date.toLocaleDateString('pt-BR');
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return dateString;
  }
};

export const ProductManagement: React.FC = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importResults, setImportResults] = useState<{ message: string; total: number; success: number; errors: string[] } | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();
  
  // Estados para os filtros - usando "all" como valor para "Todos"
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [nameFilter, setNameFilter] = useState<string>('');
  
  // Estados para o menu de ações
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Estado para o modal de visualização
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  
  // Estado para o modal de confirmação de exclusão
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);

  const [aiSuggestion, setAiSuggestion] = useState<AIMarketSuggestion | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: productService.getProducts,
  });

  // Produtos filtrados com base nos critérios
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Filtrar por categoria
      if (categoryFilter !== "all" && product.category !== categoryFilter) {
        return false;
      }
      
      // Filtrar por status
      if (statusFilter === "ativo" && !product.isActive) {
        return false;
      } else if (statusFilter === "inativo" && product.isActive) {
        return false;
      }
      
      // Filtrar por nome
      if (nameFilter && !product.name.toLowerCase().includes(nameFilter.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [products, categoryFilter, statusFilter, nameFilter]);

  // Lista de nomes de produtos para o autocomplete
  const productNames = useMemo(() => {
    const names: string[] = [];
    products.forEach(product => {
      if (!names.includes(product.name)) {
        names.push(product.name);
      }
    });
    return names;
  }, [products]);

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

  const importProductsMutation = useMutation({
    mutationFn: productService.importFromExcel,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setImportResults(data);
      setIsImporting(false);
      showNotification(`Importação concluída. ${data.success} produtos importados.`, 'success');
    },
    onError: (error) => {
      setIsImporting(false);
      console.error('Erro na importação:', error);
      showNotification('Erro ao importar produtos', 'error');
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
      expirationDate: new Date().toISOString().split('T')[0],
    },
    validationSchema,
    onSubmit: async (values) => {
      const submittedValues = { ...values };
      
      // Garantir que a data de validade seja enviada corretamente
      if (submittedValues.expirationDate) {
        // A data no formato YYYY-MM-DD vinda do input é interpretada no fuso UTC
        // Vamos ajustá-la para evitar problemas com fuso horário
        const parts = submittedValues.expirationDate.split('-');
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Os meses em JavaScript começam em 0
        const day = parseInt(parts[2]);
        
        // Criar uma data às 12:00 (meio-dia) para evitar problemas de fuso horário
        const date = new Date(year, month, day, 12, 0, 0);
        
        // Formatar para YYYY-MM-DD
        submittedValues.expirationDate = date.toISOString().split('T')[0];
        
        console.log('Data a ser enviada:', submittedValues.expirationDate);
      }
      
      try {
        if (editingProduct) {
          await updateProductMutation.mutateAsync({
            id: editingProduct._id,
            data: submittedValues,
          });
        } else {
          await createProductMutation.mutateAsync(submittedValues);
        }
      } catch (error) {
        console.error('Erro ao salvar produto:', error);
      }
    },
  });

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    
    // Formatação melhorada para a data de validade
    let formattedExpirationDate = '';
    if (product.expirationDate) {
      try {
        // Garantir que estamos trabalhando com um objeto Date válido
        console.log('Data de validade original:', product.expirationDate);
        
        // Extrair os componentes da data (formato esperado: YYYY-MM-DD)
        const parts = product.expirationDate.split('T')[0].split('-');
        if (parts.length === 3) {
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]) - 1; // Os meses em JavaScript começam em 0
          const day = parseInt(parts[2]);
          
          // Criar uma data às 12:00 (meio-dia) para evitar problemas de fuso horário
          const date = new Date(year, month, day, 12, 0, 0);
          
          // Verificar se a data é válida
          if (!isNaN(date.getTime())) {
            formattedExpirationDate = date.toISOString().split('T')[0]; // Formato YYYY-MM-DD
            console.log('Data de validade formatada:', formattedExpirationDate);
          } else {
            console.error('Data de validade inválida após processamento:', product.expirationDate);
            formattedExpirationDate = new Date().toISOString().split('T')[0]; // Data padrão como fallback
          }
        } else {
          console.error('Formato de data inesperado:', product.expirationDate);
          formattedExpirationDate = new Date().toISOString().split('T')[0]; // Data padrão como fallback
        }
      } catch (error) {
        console.error('Erro ao processar data de validade:', error);
        formattedExpirationDate = new Date().toISOString().split('T')[0]; // Data padrão como fallback
      }
    } else {
      // Caso não tenha data de validade, usar data atual como padrão
      formattedExpirationDate = new Date().toISOString().split('T')[0];
    }
    
    formik.setValues({
      name: product.name,
      description: product.description,
      category: product.category,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      ifoodPrice: product.ifoodPrice,
      quantity: product.quantity,
      weight: product.weight,
      expirationDate: formattedExpirationDate, // Data formatada
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

  const handleImportClick = () => {
    setIsImportDialogOpen(true);
    setImportResults(null);
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    try {
      const file = files[0];
      
      // Verificar tipo de arquivo
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        showNotification('Por favor, selecione um arquivo Excel válido (.xlsx ou .xls)', 'error');
        return;
      }
      
      setIsImporting(true);
      await importProductsMutation.mutateAsync(file);
      
      // Limpar o input de arquivo para permitir selecionar o mesmo arquivo novamente
      if (event.target) {
        event.target.value = '';
      }
    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      showNotification('Erro ao processar o arquivo', 'error');
      setIsImporting(false);
    }
  };

  const handleCloseImportDialog = () => {
    setIsImportDialogOpen(false);
    setImportResults(null);
  };

  const handleDownloadTemplate = () => {
    // Criar um arquivo simples CSV para download como modelo
    const csvContent = [
      'Nome,Descrição,Categoria,Peso,Quantidade,Preço de Custo,Preço de Venda,Preço iFood',
      'Frango à Milanesa,Peito de frango empanado,Frango,300g,10,15.00,29.90,32.90',
      'Bife à Parmegiana,Bife empanado com molho de tomate e queijo,Carne,400g,8,25.00,39.90,42.90',
      'Filé de Peixe Grelhado,Filé de tilápia temperado,Peixe,250g,5,18.00,34.90,36.90',
    ].join('\n');
    
    // Criar um blob e link para download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'modelo_importacao.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Função para limpar todos os filtros
  const handleClearFilters = () => {
    setCategoryFilter("all");
    setStatusFilter("all");
    setNameFilter('');
  };

  const handleActionsClick = (event: React.MouseEvent<HTMLElement>, product: Product) => {
    setAnchorEl(event.currentTarget);
    setSelectedProduct(product);
  };

  const handleActionsClose = () => {
    setAnchorEl(null);
  };

  const handleViewProduct = () => {
    if (selectedProduct) {
      setViewingProduct(selectedProduct);
      setIsViewDialogOpen(true);
      
      // Solicitar sugestões da IA quando o produto é visualizado
      fetchAiPriceSuggestion(selectedProduct);
    }
    handleActionsClose();
  };

  const handleEditProduct = () => {
    if (selectedProduct) {
      handleEdit(selectedProduct);
    }
    handleActionsClose();
  };

  const handleDeleteClick = () => {
    if (selectedProduct) {
      setProductToDelete(selectedProduct);
      setIsDeleteDialogOpen(true);
    }
    handleActionsClose();
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;
    
    try {
      // Aqui você pode adicionar a lógica para verificar se o produto pode ser excluído
      // Por exemplo, verificar se está sendo usado em relatórios
      const canDelete = true; // Substitua por sua lógica real
      
      if (canDelete) {
        await deleteProductMutation.mutateAsync(productToDelete._id);
      } else {
        // Se não puder excluir, apenas desativa o produto
        showNotification(
          'Este produto não pode ser excluído pois está sendo usado em relatórios. O produto foi desativado.',
          'warning'
        );
        await toggleProductStatusMutation.mutateAsync(productToDelete._id);
      }
      
      setIsDeleteDialogOpen(false);
      setProductToDelete(null);
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
    }
  };
  
  const handleCloseViewDialog = () => {
    setIsViewDialogOpen(false);
    setViewingProduct(null);
  };

  const handleCloseDeleteDialog = () => {
    setIsDeleteDialogOpen(false);
    setProductToDelete(null);
  };

  // Função que simula uma chamada a uma API de IA para obter sugestões de preço
  const fetchAiPriceSuggestion = async (product: Product): Promise<AIMarketSuggestion> => {
    setIsAiLoading(true);
    
    // Simulação de chamada API (em um cenário real, isso seria uma chamada fetch)
    return new Promise((resolve) => {
      setTimeout(() => {
        // Base das nossas sugestões estáticas
        const staticSuggestion = calculateMarketSuggestions(product);
        
        // Fatores de mercado simulados (em uma implementação real, viriam da API)
        const marketFactors = {
          seasonality: Math.random() > 0.5 ? 'alta' : 'baixa',
          demandTrend: ['crescente', 'estável', 'decrescente'][Math.floor(Math.random() * 3)],
          competitionLevel: Math.random() * 10, // 0-10
          ingredientCostTrend: Math.random() > 0.7 ? 'subindo' : 'estável',
        };
        
        // Ajustar margem sugerida com base em fatores de mercado
        let adjustedMargin = parseFloat(staticSuggestion.suggestedMargin);
        
        // Ajustes baseados em fatores de mercado
        if (marketFactors.seasonality === 'alta') adjustedMargin += 3;
        if (marketFactors.demandTrend === 'crescente') adjustedMargin += 2;
        if (marketFactors.competitionLevel > 7) adjustedMargin -= 3;
        if (marketFactors.ingredientCostTrend === 'subindo') adjustedMargin -= 1.5;
        
        // Calcular preço sugerido com base na margem ajustada
        const adjustedPrice = product.costPrice * (1 + adjustedMargin / 100);
        
        // Gerar insights com base nos dados
        const insights = [];
        
        if (marketFactors.seasonality === 'alta') {
          insights.push('A sazonalidade atual favorece preços mais elevados para este tipo de produto.');
        }
        
        if (marketFactors.demandTrend === 'crescente') {
          insights.push('A demanda por marmitas fitness está em alta, permitindo margens melhores.');
        } else if (marketFactors.demandTrend === 'decrescente') {
          insights.push('A demanda está caindo, considere promoções para manter o volume de vendas.');
        }
        
        if (marketFactors.competitionLevel > 7) {
          insights.push('Alta competição no mercado exige preços mais agressivos.');
        } else if (marketFactors.competitionLevel < 4) {
          insights.push('Baixa competição permite a prática de margens mais elevadas.');
        }
        
        if (marketFactors.ingredientCostTrend === 'subindo') {
          insights.push('O custo dos ingredientes está aumentando, impactando as margens.');
        }
        
        // Análise de peso x preço
        const weightAnalysis = `O peso de ${product.weight} está ${
          parseInt(product.weight.replace(/[^0-9]/g, '')) > 350 ? 'acima' : 'abaixo'
        } da média do mercado, o que ${
          parseInt(product.weight.replace(/[^0-9]/g, '')) > 350 ? 'justifica' : 'limita'
        } o preço sugerido.`;
        
        insights.push(weightAnalysis);
        
        // Análise de categoria
        const categoryMargins = {
          Frango: '40-45%',
          Carne: '45-50%', 
          Peixe: '50-55%', 
          Vegetariano: '35-40%'
        };
        
        const categoryInsight = `Produtos na categoria ${product.category} apresentam margem média de ${
          categoryMargins[product.category as keyof typeof categoryMargins] || '40-45%'
        } no mercado atual.`;
        
        insights.push(categoryInsight);
        
        // Determinar tendência do mercado
        let marketTrend: 'up' | 'down' | 'stable' = 'stable';
        if (marketFactors.demandTrend === 'crescente' && marketFactors.seasonality === 'alta') {
          marketTrend = 'up';
        } else if (marketFactors.demandTrend === 'decrescente' || marketFactors.ingredientCostTrend === 'subindo') {
          marketTrend = 'down';
        }
        
        // Gerar resumo de raciocínio
        const reasoning = `Baseado na análise de mercado, produtos ${product.category.toLowerCase()} de ${product.weight} 
          estão com demanda ${marketFactors.demandTrend}, em período de sazonalidade ${marketFactors.seasonality}, 
          e nível de competição ${marketFactors.competitionLevel > 7 ? 'alto' : marketFactors.competitionLevel < 4 ? 'baixo' : 'médio'}.
          ${marketFactors.ingredientCostTrend === 'subindo' ? 'O custo dos ingredientes está aumentando.' : 'O custo dos ingredientes está estável.'} 
          O preço sugerido leva em conta estes fatores para maximizar margem mantendo a competitividade.`;
        
        // Gerar análise de competidores
        const competitorsAnalysis = `Concorrentes diretos têm precificado produtos similares entre ${formatCurrency(adjustedPrice * 0.95)} e ${formatCurrency(adjustedPrice * 1.05)}, 
          com margens entre ${(adjustedMargin - 2).toFixed(1)}% e ${(adjustedMargin + 2).toFixed(1)}%. 
          ${marketFactors.competitionLevel > 7 ? 'A competição acirrada exige preços mais agressivos.' : 'Há espaço para trabalhar com margens melhores.'}`;
        
        // Resultado final
        const result: AIMarketSuggestion = {
          suggestedPrice: adjustedPrice,
          suggestedMargin: adjustedMargin,
          confidence: 70 + Math.random() * 25, // Confiança entre 70% e 95%
          marketTrend,
          competitorsAnalysis,
          reasoning,
          additionalInsights: insights,
          isLoading: false,
          timestamp: new Date()
        };
        
        setIsAiLoading(false);
        setAiSuggestion(result);
        resolve(result);
      }, 1500); // Tempo simulado de resposta da API (1.5 segundos)
    });
  };

  if (isLoading) {
    return <Typography>Carregando...</Typography>;
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4">Gerenciamento de Produtos</Typography>
        <Box>
          <Tooltip title="Importar Excel">
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<FileUploadIcon />}
              onClick={handleImportClick}
              sx={{ mr: 2 }}
            >
              Importar Excel
            </Button>
          </Tooltip>
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

      {/* Painel de filtros - Layout mais compacto */}
      <Paper sx={{ p: 1, mb: 2 }}>
        <Grid container spacing={1} alignItems="center">
          <Grid item xs={12} sm={5} md={4}>
            <Autocomplete
              freeSolo
              size="small"
              options={productNames}
              value={nameFilter}
              onChange={(event, newValue) => {
                setNameFilter(newValue || '');
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Buscar por nome"
                  fullWidth
                  variant="outlined"
                  size="small"
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />
          </Grid>
          <Grid item xs={6} sm={3} md={2.5}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel id="category-filter-label">Categoria</InputLabel>
              <Select
                labelId="category-filter-label"
                id="category-filter"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                label="Categoria"
              >
                <MenuItem value="all">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2">Todas</Typography>
                    {categoryFilter === "all" && (
                      <Chip 
                        size="small" 
                        label="Selecionado" 
                        color="primary" 
                        variant="outlined" 
                        sx={{ ml: 1, height: 16, fontSize: '0.65rem' }} 
                      />
                    )}
                  </Box>
                </MenuItem>
                <MenuItem value="Frango">Frango</MenuItem>
                <MenuItem value="Carne">Carne</MenuItem>
                <MenuItem value="Peixe">Peixe</MenuItem>
                <MenuItem value="Vegetariano">Vegetariano</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={3} md={2.5}>
            <FormControl fullWidth variant="outlined" size="small">
              <InputLabel id="status-filter-label">Status</InputLabel>
              <Select
                labelId="status-filter-label"
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label="Status"
              >
                <MenuItem value="all">
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2">Todos</Typography>
                    {statusFilter === "all" && (
                      <Chip 
                        size="small" 
                        label="Selecionado" 
                        color="primary" 
                        variant="outlined" 
                        sx={{ ml: 1, height: 16, fontSize: '0.65rem' }} 
                      />
                    )}
                  </Box>
                </MenuItem>
                <MenuItem value="ativo">Ativo</MenuItem>
                <MenuItem value="inativo">Inativo</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={1} md={1}>
            <Tooltip title="Limpar Filtros">
              <IconButton 
                color="primary" 
                onClick={handleClearFilters}
                size="small"
              >
                <FilterIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Grid>
          <Grid item xs={false} sm={false} md={2}>
            {/* Espaço flexível para alinhar os elementos */}
          </Grid>
        </Grid>
      </Paper>

      {/* Resumo dos filtros aplicados - Mais compacto */}
      {(categoryFilter !== "all" || statusFilter !== "all" || nameFilter) && (
        <Box mb={1} display="flex" flexWrap="wrap" gap={0.5}>
          {nameFilter && (
            <Chip 
              size="small"
              label={`Nome: ${nameFilter}`} 
              onDelete={() => setNameFilter('')}
              color="primary" 
              variant="outlined"
            />
          )}
          {categoryFilter !== "all" && (
            <Chip 
              size="small"
              label={`Categoria: ${categoryFilter}`} 
              onDelete={() => setCategoryFilter("all")}
              color="primary" 
              variant="outlined"
            />
          )}
          {statusFilter !== "all" && (
            <Chip 
              size="small"
              label={`Status: ${statusFilter === 'ativo' ? 'Ativo' : 'Inativo'}`} 
              onDelete={() => setStatusFilter("all")}
              color="primary" 
              variant="outlined"
            />
          )}
        </Box>
      )}

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
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => (
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
                    <Tooltip title="Mais opções">
                      <IconButton
                        size="small"
                        onClick={(event) => handleActionsClick(event, product)}
                      >
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={11} align="center">
                  <Typography variant="body1" sx={{ py: 2 }}>
                    Nenhum produto encontrado com os filtros selecionados.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Menu de opções para cada produto */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleActionsClose}
      >
        <MenuItem onClick={handleViewProduct}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Visualizar" />
        </MenuItem>
        <MenuItem onClick={handleEditProduct}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Editar" />
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primary="Remover" primaryTypographyProps={{ color: 'error' }} />
        </MenuItem>
      </Menu>

      {/* Dialog de visualização de produto */}
      <Dialog
        open={isViewDialogOpen}
        onClose={handleCloseViewDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle 
          sx={{ 
            backgroundColor: 'primary.main', 
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 1.5
          }}
        >
          <Typography variant="h6">Detalhes do Produto</Typography>
          {viewingProduct && (
            <Box 
              sx={{ 
                display: 'inline-flex',
                backgroundColor: viewingProduct.isActive ? '#e6f4ea' : '#fdeded',
                color: viewingProduct.isActive ? '#0d652d' : '#d32f2f',
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                alignItems: 'center'
              }}
            >
              {viewingProduct.isActive ? 'ATIVO' : 'INATIVO'}
            </Box>
          )}
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          {viewingProduct && (
            <Grid container spacing={3}>
              {/* Informações básicas */}
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f8f9fa', borderRadius: 2, mb: 1 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 'bold', mb: 1.5 }}>
                    Informações Básicas
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="textSecondary">Nome</Typography>
                      <Typography variant="body1" sx={{ fontWeight: 'medium', fontSize: '1.1rem' }}>
                        {viewingProduct.name}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="textSecondary">Descrição</Typography>
                      <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                        {viewingProduct.description}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle2" color="textSecondary">Categoria</Typography>
                      <Typography variant="body1">
                        {viewingProduct.category}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle2" color="textSecondary">Peso</Typography>
                      <Typography variant="body1">
                        {viewingProduct.weight}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle2" color="textSecondary">Quantidade em Estoque</Typography>
                      <Typography variant="body1">
                        {viewingProduct.quantity}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={4}>
                      <Typography variant="subtitle2" color="textSecondary">Data de Validade</Typography>
                      <Typography 
                        variant="body1"
                        sx={{ 
                          color: isNearExpiration(viewingProduct.expirationDate) 
                            ? 'warning.main' 
                            : isExpired(viewingProduct.expirationDate) 
                              ? 'error.main' 
                              : 'inherit'
                        }}
                      >
                        {formatDate(viewingProduct.expirationDate)}
                        {isNearExpiration(viewingProduct.expirationDate) && !isExpired(viewingProduct.expirationDate) && (
                          <Chip 
                            label="A vencer" 
                            size="small" 
                            color="warning" 
                            sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} 
                          />
                        )}
                        {isExpired(viewingProduct.expirationDate) && (
                          <Chip 
                            label="Vencido" 
                            size="small" 
                            color="error" 
                            sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} 
                          />
                        )}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
              
              {/* Informações de preço */}
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f8f9fa', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 'bold', mb: 1.5 }}>
                    Informações de Preço
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', p: 1.5, border: '1px solid #e0e0e0', borderRadius: 1, height: '100%' }}>
                        <Typography variant="subtitle2" color="textSecondary">Preço de Custo</Typography>
                        <Typography variant="h6" color="text.primary" sx={{ mt: 1 }}>
                          {formatCurrency(viewingProduct.costPrice)}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', p: 1.5, border: '1px solid #e0e0e0', borderRadius: 1, height: '100%' }}>
                        <Typography variant="subtitle2" color="textSecondary">Preço de Venda</Typography>
                        <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                          {formatCurrency(viewingProduct.sellingPrice)}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={4}>
                      <Box sx={{ display: 'flex', flexDirection: 'column', p: 1.5, border: '1px solid #e0e0e0', borderRadius: 1, height: '100%' }}>
                        <Typography variant="subtitle2" color="textSecondary">Preço iFood</Typography>
                        <Typography variant="h6" color="secondary" sx={{ mt: 1 }}>
                          {formatCurrency(viewingProduct.ifoodPrice)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
              
              {/* Informações de lucro */}
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f8f9fa', borderRadius: 2 }}>
                  <Typography variant="subtitle2" color="primary" gutterBottom sx={{ fontWeight: 'bold', mb: 1.5 }}>
                    Análise de Lucro
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        p: 2, 
                        backgroundColor: '#edf7ed', 
                        borderRadius: 2
                      }}>
                        <Typography variant="subtitle2" color="textSecondary">Margem de Lucro</Typography>
                        <Typography variant="h5" color="success.main" sx={{ fontWeight: 'bold', mt: 1 }}>
                          {calculateProfitMarginPercentage(viewingProduct.costPrice, viewingProduct.sellingPrice)}
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center',
                        p: 2, 
                        backgroundColor: '#e3f2fd', 
                        borderRadius: 2
                      }}>
                        <Typography variant="subtitle2" color="textSecondary">Lucro por Unidade</Typography>
                        <Typography variant="h5" color="primary.main" sx={{ fontWeight: 'bold', mt: 1 }}>
                          {formatCurrency(calculateProfitMarginValue(viewingProduct.costPrice, viewingProduct.sellingPrice))}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>

              {/* Nova seção: Sugestões do Mercado com IA */}
              <Grid item xs={12}>
                <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f8f9fa', borderRadius: 2 }}>
                  <Box display="flex" alignItems="center" mb={1.5}>
                    <PsychologyIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="subtitle2" color="primary" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
                      Análise de Mercado com Inteligência Artificial
                    </Typography>
                  </Box>

                  {isAiLoading ? (
                    <Box sx={{ my: 3, textAlign: 'center' }}>
                      <CircularProgress size={40} />
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                        Analisando o mercado e gerando recomendações inteligentes...
                      </Typography>
                      <LinearProgress sx={{ mt: 2, mb: 1 }} />
                    </Box>
                  ) : aiSuggestion ? (
                    <>
                      <Box sx={{ mb: 2, p: 1.5, backgroundColor: '#e3f2fd', borderRadius: 1, border: '1px dashed #90caf9' }}>
                        <Box display="flex" alignItems="center" mb={1}>
                          <StorefrontIcon color="primary" fontSize="small" sx={{ mr: 1 }} />
                          <Typography variant="body2" color="primary" sx={{ fontWeight: 'medium' }}>
                            Análise baseada em dados de mercado em tempo real
                          </Typography>
                          <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center' }}>
                            <Typography variant="caption" color="text.secondary">
                              Confiança:
                            </Typography>
                            <Box sx={{ 
                              ml: 1, 
                              px: 1, 
                              py: 0.5, 
                              borderRadius: 1, 
                              bgcolor: aiSuggestion.confidence > 85 ? '#e6f4ea' : '#fff3e0',
                              fontSize: '0.75rem',
                              fontWeight: 'bold'
                            }}>
                              {aiSuggestion.confidence.toFixed(0)}%
                            </Box>
                          </Box>
                        </Box>
                        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', fontSize: '0.875rem' }}>
                          {aiSuggestion.reasoning}
                        </Typography>
                      </Box>

                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            p: 2, 
                            backgroundColor: '#fff8e1', 
                            borderRadius: 2,
                            height: '100%',
                            border: '1px solid #ffe082'
                          }}>
                            <Box display="flex" alignItems="center">
                              <BarChartIcon color="warning" fontSize="small" sx={{ mr: 1 }} />
                              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                Margem Ideal (IA)
                              </Typography>
                              {aiSuggestion.marketTrend === 'up' && <TrendingUpIcon color="success" fontSize="small" sx={{ ml: 'auto' }} />}
                            </Box>
                            
                            <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
                              <Typography variant="h5" color="warning.dark" sx={{ fontWeight: 'bold' }}>
                                {aiSuggestion.suggestedMargin.toFixed(2)}%
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ ml: 1, fontStyle: 'italic' }}>
                                vs. atual {calculateProfitMarginPercentage(viewingProduct.costPrice, viewingProduct.sellingPrice)}
                              </Typography>
                            </Box>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="body2" sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                              {aiSuggestion.marketTrend === 'up' ? (
                                <span>Tendência de <Box component="span" sx={{ color: 'success.main', fontWeight: 'bold' }}>alta</Box> no mercado</span>
                              ) : aiSuggestion.marketTrend === 'down' ? (
                                <span>Tendência de <Box component="span" sx={{ color: 'error.main', fontWeight: 'bold' }}>queda</Box> no mercado</span>
                              ) : (
                                <span>Mercado <Box component="span" sx={{ color: 'info.main', fontWeight: 'bold' }}>estável</Box></span>
                              )}
                            </Typography>
                          </Box>
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            p: 2, 
                            backgroundColor: '#e8eaf6', 
                            borderRadius: 2,
                            height: '100%',
                            border: '1px solid #c5cae9'
                          }}>
                            <Box display="flex" alignItems="center">
                              <ShoppingBasketIcon color="primary" fontSize="small" sx={{ mr: 1 }} />
                              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                Preço Competitivo (IA)
                              </Typography>
                            </Box>
                            
                            <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
                              <Typography variant="h5" color="primary.dark" sx={{ fontWeight: 'bold' }}>
                                {formatCurrency(aiSuggestion.suggestedPrice)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ ml: 1, fontStyle: 'italic' }}>
                                vs. atual {formatCurrency(viewingProduct.sellingPrice)}
                              </Typography>
                            </Box>
                            <Divider sx={{ my: 1 }} />
                            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                              {Math.abs(aiSuggestion.suggestedPrice - viewingProduct.sellingPrice) < 0.5 ? (
                                <span>Seu preço está <Box component="span" sx={{ color: 'success.main', fontWeight: 'bold' }}>bem posicionado</Box> no mercado</span>
                              ) : aiSuggestion.suggestedPrice > viewingProduct.sellingPrice ? (
                                <span>Preço atual <Box component="span" sx={{ color: 'error.main', fontWeight: 'bold' }}>abaixo</Box> do valor competitivo</span>
                              ) : (
                                <span>Preço atual <Box component="span" sx={{ color: 'warning.main', fontWeight: 'bold' }}>acima</Box> do valor competitivo</span>
                              )}
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12}>
                          <Box sx={{ p: 2, backgroundColor: '#f5f5f5', borderRadius: 2, border: '1px solid #e0e0e0' }}>
                            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                              Análise de Concorrência
                            </Typography>
                            <Typography variant="body2">
                              {aiSuggestion.competitorsAnalysis}
                            </Typography>
                          </Box>
                        </Grid>
                        
                        <Grid item xs={12}>
                          <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ mt: 1 }}>
                            Insights Adicionais
                          </Typography>
                          <List dense sx={{ bgcolor: '#fafafa', borderRadius: 1, border: '1px solid #f0f0f0' }}>
                            {aiSuggestion.additionalInsights.map((insight, index) => (
                              <ListItem key={index} sx={{ py: 0.5 }}>
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                  <Box
                                    sx={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: '50%',
                                      bgcolor: 'primary.main',
                                    }}
                                  />
                                </ListItemIcon>
                                <ListItemText
                                  primary={insight}
                                  primaryTypographyProps={{ variant: 'body2' }}
                                />
                              </ListItem>
                            ))}
                          </List>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'right' }}>
                            Análise gerada em: {aiSuggestion.timestamp.toLocaleString()}
                          </Typography>
                        </Grid>
                      </Grid>
                    </>
                  ) : (
                    <Box sx={{ textAlign: 'center', py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Ainda não há análise de IA disponível para este produto.
                      </Typography>
                      <Button 
                        variant="outlined"
                        color="primary"
                        size="small"
                        startIcon={<PsychologyIcon />}
                        onClick={() => fetchAiPriceSuggestion(viewingProduct)}
                        sx={{ mt: 2 }}
                      >
                        Analisar com IA
                      </Button>
                    </Box>
                  )}
                </Paper>
              </Grid>
              
              {/* Seção de cálculos básicos */}
              <Grid item xs={12}>
                {(() => {
                  const marketData = calculateMarketSuggestions(viewingProduct);
                  return (
                    <Paper elevation={0} sx={{ p: 2, backgroundColor: '#f8f9fa', borderRadius: 2 }}>
                      <Typography variant="subtitle2" color="textSecondary" gutterBottom sx={{ fontWeight: 'bold', mb: 1.5, display: 'flex', alignItems: 'center' }}>
                        Cálculos Básicos
                        <Tooltip title="Análise simples baseada em cálculos padrão">
                          <Box component="span" sx={{ ml: 1, cursor: 'help', fontSize: '0.9rem', color: 'text.secondary' }}>
                            (i)
                          </Box>
                        </Tooltip>
                      </Typography>

                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            p: 2, 
                            backgroundColor: '#fff3e0', 
                            borderRadius: 2,
                            height: '100%'
                          }}>
                            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                              Margem Sugerida (Padrão)
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
                              <Typography variant="h6" color="warning.dark" sx={{ fontWeight: 'bold' }}>
                                {marketData.suggestedMargin}%
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ ml: 1, fontStyle: 'italic' }}>
                                vs. atual {marketData.currentMargin}%
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>

                        <Grid item xs={12} md={6}>
                          <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column',
                            p: 2, 
                            backgroundColor: '#e8eaf6', 
                            borderRadius: 2,
                            height: '100%'
                          }}>
                            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                              Preço de Venda Padrão
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
                              <Typography variant="h6" color="primary.dark" sx={{ fontWeight: 'bold' }}>
                                {formatCurrency(marketData.suggestedPrice)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary" sx={{ ml: 1, fontStyle: 'italic' }}>
                                vs. atual {formatCurrency(viewingProduct.sellingPrice)}
                              </Typography>
                            </Box>
                          </Box>
                        </Grid>
                      </Grid>
                    </Paper>
                  );
                })()}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          <Button 
            onClick={handleCloseViewDialog} 
            variant="outlined"
            sx={{ borderRadius: 2 }}
          >
            Fechar
          </Button>
          <Box>
            {viewingProduct && aiSuggestion && (
              <Button 
                color="secondary" 
                variant="outlined"
                sx={{ borderRadius: 2, mr: 1 }}
                onClick={() => {
                  // Aplicar o preço sugerido pela IA
                  setEditingProduct(viewingProduct);
                  formik.setValues({
                    ...formik.values,
                    sellingPrice: aiSuggestion.suggestedPrice,
                    ifoodPrice: aiSuggestion.suggestedPrice * 1.1, // Exemplo: iFoodPrice é 10% maior que o preço normal
                  });
                  handleCloseViewDialog();
                  setIsDialogOpen(true);
                }}
              >
                Aplicar Preço Sugerido
              </Button>
            )}
            <Button 
              color="primary" 
              variant="contained" 
              startIcon={<EditIcon />}
              sx={{ borderRadius: 2 }}
              onClick={() => {
                handleCloseViewDialog();
                if (viewingProduct) handleEdit(viewingProduct);
              }}
            >
              Editar Produto
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <Dialog
        open={isDeleteDialogOpen}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tem certeza que deseja excluir o produto &quot;{productToDelete?.name}&quot;?
            Esta ação não pode ser desfeita.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancelar</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de formulário de produto - Adicionar toggle para ativar/desativar */}
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

              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  fullWidth
                  margin="normal"
                  id="expirationDate"
                  name="expirationDate"
                  label="Data de Validade"
                  type="date"
                  value={formik.values.expirationDate}
                  onChange={formik.handleChange}
                  error={formik.touched.expirationDate && Boolean(formik.errors.expirationDate)}
                  helperText={formik.touched.expirationDate && formik.errors.expirationDate}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  inputProps={{
                    min: new Date().toISOString().split('T')[0] // Data mínima: hoje
                  }}
                  required
                />
              </Grid>
            </Grid>
            
            {/* Adicionar toggle para ativar/desativar (apenas quando estiver editando) */}
            {editingProduct && (
              <Box sx={{ mt: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={editingProduct.isActive}
                      onChange={() => toggleProductStatusMutation.mutate(editingProduct._id)}
                      color={editingProduct.isActive ? "success" : "error"}
                    />
                  }
                  label={
                    <Typography color={editingProduct.isActive ? "success.main" : "error.main"}>
                      {editingProduct.isActive ? "Produto Ativo" : "Produto Inativo"}
                    </Typography>
                  }
                />
              </Box>
            )}
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

      {/* Dialog de importação de Excel */}
      <Dialog
        open={isImportDialogOpen}
        onClose={handleCloseImportDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Importar Produtos do Excel</DialogTitle>
        <DialogContent>
          {isImporting ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 3, mb: 3 }}>
              <CircularProgress />
              <Typography variant="body1" sx={{ mt: 2 }}>
                Processando importação...
              </Typography>
            </Box>
          ) : importResults ? (
            <Box sx={{ mt: 2 }}>
              <Alert severity={importResults.errors.length > 0 ? 'warning' : 'success'}>
                {importResults.message}
              </Alert>
              
              {importResults.errors.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Erros encontrados:
                  </Typography>
                  <List dense>
                    {importResults.errors.map((error, index) => (
                      <ListItem key={index}>
                        <ListItemText primary={error} />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          ) : (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body1" paragraph>
                Selecione um arquivo Excel (.xlsx ou .xls) para importar produtos em lote.
              </Typography>
              
              <Typography variant="body2" paragraph>
                O arquivo deve conter as seguintes colunas:
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemText primary="Nome" secondary="Nome do produto (obrigatório)" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Descrição" secondary="Descrição do produto" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Categoria" secondary="Frango, Carne, Peixe ou Vegetariano (obrigatório)" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Peso" secondary="Peso do produto (ex: 300g)" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Quantidade" secondary="Quantidade em estoque (número)" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Preço de Custo" secondary="Valor em reais (obrigatório)" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Preço de Venda" secondary="Valor em reais (obrigatório)" />
                </ListItem>
                <ListItem>
                  <ListItemText primary="Preço iFood" secondary="Valor em reais (obrigatório)" />
                </ListItem>
              </List>
              
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleFileSelect}
                  startIcon={<FileUploadIcon />}
                >
                  Selecionar Arquivo
                </Button>
                <input 
                  type="file"
                  accept=".xlsx,.xls"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Button
                  variant="outlined"
                  color="primary"
                  onClick={handleDownloadTemplate}
                >
                  Baixar Modelo de Planilha
                </Button>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseImportDialog} color="primary">
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}; 